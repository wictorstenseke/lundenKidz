# lundenKidz

A side-scrolling platform game in the style of Super Nintendo platformers, starring the author's three kids.

## Language

**Character**:
One of three playable kids, each shown by a headshot photo. Chosen before play.
_Avoid_: Hero, avatar, skin

**Player**:
The Character currently being controlled.
_Avoid_: User, hero

**Enemy**:
A hostile creature in a level that the Player can avoid, Stomp, or be hurt by.
_Avoid_: Monster, mob, baddie

**Stomp**:
Landing on top of an Enemy from above, which kills it and bounces the Player upward.
_Avoid_: Jump-kill, squash

**Heart**:
One unit of the Player's health. The Player has five; touching an Enemy sideways or from below costs one.
_Avoid_: HP, life

**Checkpoint**:
A point in a level where the Player restarts after losing all Hearts.
_Avoid_: Save point, respawn

**Invincibility**:
A brief window after losing a Heart in which the Player blinks, is knocked back, and cannot be hurt.
_Avoid_: Grace period, i-frames

**Heart Pickup**:
An item in a level that restores one Heart.
_Avoid_: Health pack, potion

**Diamond**:
A blue collectible scattered through levels.
_Avoid_: Coin, gem, crystal

### Levels

**Level**:
One side-scrolling stage, played in a fixed sequence with the others.
_Avoid_: Stage, world, map

**Cloud**:
A platform floating in the sky that can be jumped up through and stood on.
_Avoid_: Cloud platform, sky platform

**Spring**:
A bounce pad that launches the Player high into the air when landed on.
_Avoid_: Trampoline, jump pad, bouncer

**Ice**:
Slippery ground (Snowy Hills) on which the Player glides when starting, stopping or turning.
_Avoid_: Slide, slippery floor

**Goal Flag**:
The flag at the end of a Level (far right, or the top for climbing Levels); touching it completes the Level.
_Avoid_: Exit, finish line, goal post

### MTB Trail

**MTB Trail**:
A separate endless mode where the Player rides a mountain bike right by themselves, ever faster, and can only jump; it ends when 3 Hearts are lost.
_Avoid_: Endless Run, runner, dino mode

**Hurdle**:
A low trail obstacle (rock, log, log pile, stump) that costs a Heart when touched but never blocks the bike.
_Avoid_: Obstacle, trap

**Ramp**:
A wooden kicker on the MTB Trail that the bike rolls up; jumping on it pops the bike high (highest near the top), otherwise it just rolls off.
_Avoid_: Kicker, jump, ramp jump

**Gap**:
A hole in the MTB Trail; falling in costs a Heart and the ride continues past it.
_Avoid_: Pit, hole

**Wheelie**:
Riding on the back wheel by holding back on the MTB Trail; the longer it's held, the more Score.
_Avoid_: Manual

**Flip**:
A full backward (hold back) or forward (hold forward) rotation in the air on the MTB Trail, scored on a clean landing.
_Avoid_: Rotation, spin, trick

**Crash**:
Landing on the MTB Trail too far from upright; costs a Heart.
_Avoid_: Wipeout, bail

**Big Air**:
Bonus Score for a long flight after a Ramp.
_Avoid_: Trick, airtime

**Score**:
MTB Trail points: distance ridden plus bonuses for Diamonds, Stomps, Wheelies, Flips and Big Air.
_Avoid_: Points, distance

**Highscore**:
One of the five best Scores on this computer, each remembering which Character set it.
_Avoid_: Record, best

### Enemy types

**Walker**:
An Enemy that patrols back and forth. Stompable.

**Hopper**:
An Enemy that jumps periodically. Stompable.

**Spiky**:
An Enemy that walks and cannot be Stomped; touching it from above costs a Heart.
_Avoid_: Spiny
