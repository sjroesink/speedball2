package main

import (
	_ "embed"
	"encoding/json"
	"math"
)

//go:embed physical-pose-data.json
var physicalPoseJSON []byte
var physicalPoseData struct {
	Groups   map[string][][]int
	Controls map[string][]int
	Offsets  [][2]int
	Origins  [][2]int
}

// distance_to_point includes the querying player's vertical sprite origin.
func playerPointDistance(p *Player, x, z float64) int {
	origin := physicalPoseData.Origins[p.physicalSprite]
	return referenceDistance(p.X-float64(origin[1])*terrainUnit-x, p.Z-z)
}
func opponentDistance(p, q *Player) int {
	target, query := p, q
	if p.Team != 0 {
		target, query = q, p
	}
	origin := physicalPoseData.Origins[target.physicalSprite]
	return playerPointDistance(query, target.X-float64(origin[1])*terrainUnit, target.Z+float64(origin[0])*terrainUnit)
}

func init() {
	if err := json.Unmarshal(physicalPoseJSON, &physicalPoseData); err != nil {
		panic(err)
	}
}
func advancePhysicalPose(p *Player, i, period int, dt float64) {
	direction := (int(math.Round(math.Atan2(p.FZ, p.FX)*4/math.Pi)) + 8) % 8
	up := (p.Team == 0) == (period != 2)
	keeper := i%9 == 0
	kind := p.Action
	if kind == 0 && (p.moveX != 0 || p.moveZ != 0) {
		kind = 5
	}
	group := []string{"standing", "slide", "jump", "throw", "fall", "run", "catch", "punch"}[kind]
	index := 0
	if kind == 5 {
		index = int(math.Floor(p.poseCursor+1e-7)) & 7
		p.poseCursor = math.Mod(p.poseCursor+dt*25, 8)
	} else if kind != 0 {
		duration := 4. / 25
		switch kind {
		case 1, 2:
			duration = actionDuration(kind, p.Stats[3])
		case 3:
			duration = 8. / 25
		case 4:
			duration = fallDuration
		case 6:
			duration = 3. / 25
		}
		if p.poseKind == kind && p.ActionTime <= p.poseRemaining+1e-9 {
			duration = p.poseDuration
		}
		p.poseDuration = duration
		index = max(0, int(math.Floor((duration-p.ActionTime)*25+1e-7)))
		if kind == 2 && p.ActionTime <= 2./25+1e-9 {
			index = 18 + max(0, int(math.Floor((2./25-p.ActionTime)*25+1e-7)))
		}
		if kind == 1 && p.ActionTime <= 1./25+1e-9 {
			index = 15
		}
		p.poseCursor = float64(index + 1)
	} else {
		p.poseCursor = 0
	}
	if keeper && (kind == 0 || kind == 5 || kind == 6) {
		if kind == 0 {
			group = "stand"
		} else if kind == 5 {
			group = "run"
		} else {
			group = "catch"
		}
		if up {
			group += "Up"
		} else {
			group += "Down"
		}
	}
	if keeper && kind == 0 {
		direction = 4
		if up {
			direction = 0
		}
	}
	frames := physicalPoseData.Groups[group][direction]
	index = min(index, len(frames)-1)
	p.poseCursor = float64(index + 1)
	if index == len(frames)-1 {
		switch physicalPoseData.Controls[group][direction] {
		case -1, -4:
			p.poseCursor = 0
		case -2, -5:
			p.poseCursor = float64(index)
		}
	}
	p.physicalSprite = frames[index]
	p.physicalPoseValid = true
	p.physicalFrame = index
	p.poseKind = kind
	p.poseRemaining = p.ActionTime
}
func physicalBallOffset(p *Player, b *Ball) (float64, float64) {
	correction := 12
	if b.heldJump && p.Action == 2 && p.physicalFrame >= 2 && p.physicalFrame < 18 {
		correction = 8
	}
	origin := physicalPoseData.Offsets[p.physicalSprite]
	return -float64(origin[1]-correction) * terrainUnit, float64(origin[0]-correction) * terrainUnit
}
