// ============================================================
// Speedball 2: Brutal Deluxe — Match Engine
// ============================================================

import {
  TeamSide,
  MatchState,
  MatchResult,
  PlayerRole,
} from '../utils/types';
import {
  getCreditsEarned,
  getInjuryChance,
  getTackleSuccessChance,
  POINTS_GOAL,
  POINTS_TACKLE,
  POINTS_STAR_BONUS,
  POINTS_INJURY,
  SCORE_MULTIPLIER,
  HALF_DURATION,
} from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { StarElement, MultiplierElement } from '../entities/ArenaElements';

// ================================================================
// TeamMatchData
// ================================================================

export interface TeamMatchData {
  side:               TeamSide;
  score:              number;
  goals:              number;
  tackles:            number;
  starsActivated:     { top: number; bottom: number };
  hasMultiplier:      boolean;
  players:            Player[];
  controlledPlayerIndex: number;
}

// ================================================================
// MatchEngine
// ================================================================

export class MatchEngine {
  state: MatchState = MatchState.KICKOFF;

  /** Current half: 1 or 2 */
  half: number = 1;

  /** Match timer in seconds, counting down from HALF_DURATION */
  timer: number = HALF_DURATION;

  homeTeam!: TeamMatchData;
  awayTeam!: TeamMatchData;

  /** Name of the team taking the next kickoff */
  private kickoffSide: TeamSide = TeamSide.HOME;

  /** Countdown for timed states (GOAL_SCORED, HALFTIME) in seconds */
  private stateTimer: number = 0;

  // ------ Initialisation ---------------------------------------------------

  /**
   * Builds both TeamMatchData objects from arrays of instantiated Player entities.
   * @param homePlayers  All Player entities on the home side
   * @param awayPlayers  All Player entities on the away side
   */
  initTeams(homePlayers: Player[], awayPlayers: Player[]): void {
    this.homeTeam = this.makeTeamData(TeamSide.HOME, homePlayers);
    this.awayTeam = this.makeTeamData(TeamSide.AWAY, awayPlayers);
  }

  private makeTeamData(side: TeamSide, players: Player[]): TeamMatchData {
    return {
      side,
      score:          0,
      goals:          0,
      tackles:        0,
      starsActivated: { top: 0, bottom: 0 },
      hasMultiplier:  false,
      players,
      controlledPlayerIndex: this.findFirstNonKeeper(players),
    };
  }

  private findFirstNonKeeper(players: Player[]): number {
    const idx = players.findIndex(p => !p.isGoalkeeper);
    return idx >= 0 ? idx : 0;
  }

  // ------ Team Access ------------------------------------------------------

  getTeam(side: TeamSide): TeamMatchData {
    return side === TeamSide.HOME ? this.homeTeam : this.awayTeam;
  }

  getOpponentTeam(side: TeamSide): TeamMatchData {
    return side === TeamSide.HOME ? this.awayTeam : this.homeTeam;
  }

  // ------ Player Control ---------------------------------------------------

  getControlledPlayer(team: TeamMatchData): Player {
    return team.players[team.controlledPlayerIndex];
  }

  /**
   * Switches the controlled player to the active (non-keeper) player nearest
   * to the ball's position.
   */
  switchControlledPlayer(team: TeamMatchData, ball: Ball): void {
    let bestIdx   = team.controlledPlayerIndex;
    let bestDist  = Infinity;

    for (let i = 0; i < team.players.length; i++) {
      const p = team.players[i];
      if (!p.isActive || p.isGoalkeeper) continue;

      const dx = p.x - ball.x;
      const dy = p.y - ball.y;
      const d  = dx * dx + dy * dy; // compare squared distances

      if (d < bestDist) {
        bestDist = d;
        bestIdx  = i;
      }
    }

    team.controlledPlayerIndex = bestIdx;
  }

  // ------ Scoring ----------------------------------------------------------

  /**
   * Records a goal for the scoring team.
   * Applies the 2× multiplier if the scoring team currently holds one.
   * Transitions to GOAL_SCORED state with a 2-second display timer.
   * Gives kickoff to the opponent.
   * @param scoringTeam  The team that just scored
   * @param _multipliers Arena multiplier elements (unused here — deactivated via activateMultiplier)
   */
  scoreGoal(scoringTeam: TeamMatchData, _multipliers: MultiplierElement[]): void {
    const pts = scoringTeam.hasMultiplier
      ? POINTS_GOAL * SCORE_MULTIPLIER
      : POINTS_GOAL;

    scoringTeam.score += pts;
    scoringTeam.goals += 1;

    if (scoringTeam.hasMultiplier) {
      scoringTeam.hasMultiplier = false;
    }

    // Transition state
    this.state      = MatchState.GOAL_SCORED;
    this.stateTimer = 2;

    // Kickoff goes to the team that was scored against
    this.kickoffSide = this.getOpponentTeam(scoringTeam.side).side;
  }

  /** Awards tackle points to the given team. */
  scoreTackle(team: TeamMatchData): void {
    team.score   += POINTS_TACKLE;
    team.tackles += 1;
  }

  /**
   * Attempts a tackle by the attacker against the target.
   * On success: releases the ball (if target held it), stuns the target,
   * awards tackle points, and rolls for injury.
   *
   * @param attacker  The tackling player
   * @param target    The player being tackled
   * @param ball      The match ball
   * @returns true if the tackle succeeded
   */
  tryTackle(attacker: Player, target: Player, ball: Ball): boolean {
    const chance = getTackleSuccessChance(
      attacker.playerDef.stats.strength,
      target.playerDef.stats.defense,
    );

    if (Math.random() > chance) return false;

    // Success
    if (target.hasBall) {
      target.hasBall = false;
      ball.release();
    }

    target.stun();

    const attackerTeam = this.getTeam(attacker.teamSide);
    this.scoreTackle(attackerTeam);

    // Injury check
    const injuryChance = getInjuryChance(attacker.playerDef.stats.strength);
    if (Math.random() < injuryChance) {
      target.injure();
      attackerTeam.score += POINTS_INJURY;
    }

    return true;
  }

  // ------ Stars & Multipliers ----------------------------------------------

  /**
   * Marks a star as activated for the given team.
   * If all 5 stars on the same side are now activated by the same team,
   * awards a 10-point bonus and resets all stars on that side.
   *
   * @param star     The star element being activated
   * @param team     The team activating the star
   * @param allStars All star elements in the arena
   */
  activateStar(star: StarElement, team: TeamMatchData, allStars: StarElement[]): void {
    star.activate(team.side);
    team.starsActivated[star.side] += 1;

    // Check for full set (5 stars same side, same team)
    const sideStars = allStars.filter(s => s.side === star.side);
    const allByTeam = sideStars.every(
      s => s.activated && s.activatedBy === team.side,
    );

    if (allByTeam) {
      team.score += POINTS_STAR_BONUS;
      team.starsActivated[star.side] = 0;
      sideStars.forEach(s => s.reset());
    }
  }

  /**
   * Activates a multiplier power-up for the team, if it's available.
   *
   * @param mult  The multiplier element
   * @param team  The team picking it up
   */
  activateMultiplier(mult: MultiplierElement, team: TeamMatchData): void {
    if (!mult.isAvailable()) return;
    mult.activate(team.side);
    team.hasMultiplier = true;
  }

  // ------ Update -----------------------------------------------------------

  /**
   * Main per-frame update. Handles timed state transitions, match timer
   * countdown, halftime, and match end.
   * @param delta  Frame delta in milliseconds
   */
  update(delta: number): void {
    const dt = delta / 1000;

    switch (this.state) {
      case MatchState.GOAL_SCORED:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = MatchState.KICKOFF;
        }
        break;

      case MatchState.HALFTIME:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.half  = 2;
          this.timer = HALF_DURATION;
          this.state = MatchState.KICKOFF;
        }
        break;

      case MatchState.PLAYING:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0;
          if (this.half === 1) {
            this.state      = MatchState.HALFTIME;
            this.stateTimer = 3; // brief halftime pause
            this.kickoffSide = TeamSide.AWAY; // away kicks off second half
          } else {
            this.state = MatchState.MATCH_END;
          }
        }
        break;

      case MatchState.KICKOFF:
      case MatchState.MATCH_END:
      default:
        break;
    }
  }

  // ------ Kickoff ----------------------------------------------------------

  /** Returns the TeamSide that will take the next kickoff. */
  getKickoffTeam(): TeamSide {
    return this.kickoffSide;
  }

  /** Transitions from KICKOFF state into active PLAYING. */
  startPlay(): void {
    this.state = MatchState.PLAYING;
  }

  // ------ Result -----------------------------------------------------------

  /**
   * Computes the final MatchResult.
   * @param playerTeamSide  The side the human player controls
   * @param homeTeamName    Display name for the home team
   * @param awayTeamName    Display name for the away team
   */
  getResult(
    playerTeamSide: TeamSide,
    homeTeamName:   string,
    awayTeamName:   string,
  ): MatchResult {
    const home = this.homeTeam;
    const away = this.awayTeam;

    const won   = playerTeamSide === TeamSide.HOME
      ? home.score > away.score
      : away.score > home.score;
    const drawn = home.score === away.score;

    const playerTeam   = this.getTeam(playerTeamSide);
    const creditsEarned = getCreditsEarned(won, drawn, playerTeam.score);

    // Determine MVP — player with hasBall most recently or highest scoring player
    // (simple heuristic: pick most impactful player from the player's team)
    const mvp = this.findMVP(playerTeam);

    // Collect goal scorer names from the team's players
    // Since we don't track per-player goals in this engine version,
    // we attribute each goal to the controlled player at scoring time.
    // For now we emit an empty array (filled in by PhysicsManager/MatchScene).
    const homeGoals: string[] = [];
    const awayGoals: string[] = [];

    return {
      homeTeam:    homeTeamName,
      awayTeam:    awayTeamName,
      homeScore:   home.score,
      awayScore:   away.score,
      homeTackles: home.tackles,
      awayTackles: away.tackles,
      homeGoals,
      awayGoals,
      mvp,
      creditsEarned,
    };
  }

  private findMVP(team: TeamMatchData): string {
    // Simple heuristic: active player with the lowest index (starter)
    // A real implementation would track per-player stats.
    const active = team.players.find(p => p.isActive && !p.isGoalkeeper);
    return active ? active.playerDef.name : (team.players[0]?.playerDef.name ?? 'Unknown');
  }
}

