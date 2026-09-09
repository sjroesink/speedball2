package main

// active_forward_player_with_ball_ai (0xf60a..0xf736).
func (s *State) forwardDecision(i, random int, distances *[18]int) *passPlan {
	p := &s.Players[i]
	goal := s.goalThrow(i, random)
	if s.Ball.Charged {
		return goal
	}
	blocked := s.opponentDirections(i, distances)
	if goal.key != blocked[0] && absInt(goal.key) > 1 {
		return goal
	}
	j := s.Controlled[1-p.Team]
	if j < 0 || s.Players[j].Stun > 0 || s.Players[j].Health <= 0 || distances[j] > 64 {
		x, z := s.supportPosition(i, true)
		key := passDirection(p, x, z)
		if key != 0 && key != blocked[0] && key != blocked[1] {
			return &passPlan{x: x, z: z, key: key, move: true}
		}
	}
	receiver, distance := -1, p.Stats[7]*2
	aim := func(j int) *passPlan {
		q := &s.Players[j]
		x, z := predictedTarget(q.X, q.Z, q.moveX, q.moveZ, p.Stats[7])
		return &passPlan{receiver: j, x: x, z: z, key: passDirection(p, x, z)}
	}
	for _, minimum := range []int{3, 2} {
		for j, q := range s.Players {
			if j == i || q.Team != p.Team || q.Stun > 0 || q.Health <= 0 || supportRole(j) < minimum || distances[j] > distance {
				continue
			}
			key := aim(j).key
			if key == blocked[0] || key == blocked[1] {
				continue
			}
			receiver, distance = j, distances[j]
		}
		if receiver >= 0 {
			break
		}
	}
	if receiver < 0 {
		return goal
	}
	result := aim(receiver)
	result.high = p.Stats[4]*2 <= distance
	result.steer = goal.steer
	return result
}
