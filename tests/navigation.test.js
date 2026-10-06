import test from "node:test";
import assert from "node:assert/strict";
import {
  canStand,
  currentRoom,
  roomPoint,
  toRoom,
  destinations,
  design,
  lobbyOutline,
} from "../src/world/layout.js";

test("all arrival positions are on accessible floor, clear of furniture", () => {
  for (const [id, d] of Object.entries(destinations)) {
    if (id === "overview") continue;
    assert.equal(canStand(d.position[0], d.position[2]), true, id);
    assert.equal(currentRoom(d.position[0], d.position[2]), id);
  }
});
test("each gallery has a continuous accessible central aisle from lobby to rear wall", () => {
  for (const id of ["01", "02", "03"])
    for (let distance = -4; distance < 23.5; distance += 0.1) {
      const p = roomPoint(id, 0, distance);
      assert.equal(canStand(p[0], p[2]), true, `${id} aisle at ${distance}`);
    }
});
test("walls, portal jambs, and far ends cannot be crossed", () => {
  for (const id of ["01", "02", "03"])
    for (const [sideways, distance] of [
      [6, 10],
      [-6, 10],
      [0, 24],
      [3, 0],
      [-3, -0.2],
    ]) {
      const p = roomPoint(id, sideways, distance);
      assert.equal(
        canStand(p[0], p[2]),
        false,
        `${id} wall ${sideways} ${distance}`,
      );
    }
});
test("all exhibition objects block walking while adjacent aisle remains accessible", () => {
  for (const o of [...design.panels, ...design.benches, ...design.cases]) {
    const p = roomPoint(o.room, o.t, o.v);
    assert.equal(canStand(p[0], p[2]), false, o.id);
  }
  assert.equal(canStand(0, 0), false, "central plinth");
  for (const c of design.lobby.columns)
    assert.equal(canStand(c.x, -c.y), false, c.id);
  for (const b of design.lobby.benches) {
    const a = (b.angle * Math.PI) / 180;
    assert.equal(canStand(5 * Math.cos(a), -5 * Math.sin(a)), false, b.id);
  }
});
test("diagonal panel ends block walking at their new positions in both galleries", () => {
  for (const panel of design.panels) {
    const side = Math.sign(panel.t);
    for (const offset of [-0.8, 0.8]) {
      const point = roomPoint(
        panel.room,
        panel.t - side * offset,
        panel.v + offset,
      );
      assert.equal(
        canStand(point[0], point[2]),
        false,
        `${panel.id} diagonal end ${offset}`,
      );
    }
  }
});
test("the former straight panel ends no longer leave invisible obstacles", () => {
  for (const panel of design.panels) {
    for (const sign of [-1, 1]) {
      const point = roomPoint(
        panel.room,
        panel.t + (panel.room === "02" ? sign * 1.35 : 0),
        panel.v + (panel.room === "01" ? sign * 1.35 : 0),
      );
      assert.equal(
        canStand(point[0], point[2]),
        true,
        `${panel.id} old end ${sign}`,
      );
    }
  }
});
test("the diagonal arrangement keeps a three metre central walking lane clear", () => {
  for (const id of ["01", "02"])
    for (const side of [-1.5, 0, 1.5])
      for (let distance = 0.5; distance < 23.5; distance += 0.1) {
        const point = roomPoint(id, side, distance);
        assert.equal(
          canStand(point[0], point[2]),
          true,
          `${id} lane ${side}, ${distance}`,
        );
      }
});
test("world and gallery coordinates agree across all three 120 degree branches", () => {
  for (const id of ["01", "02", "03"])
    for (const t of [-5, 0, 5])
      for (const v of [0, 12, 24]) {
        const p = roomPoint(id, t, v),
          q = toRoom(id, p[0], p[2]);
        assert.ok(Math.abs(q.t - t) < 1e-10);
        assert.ok(Math.abs(q.v - v) < 1e-10);
      }
});
test("Y lobby outline stays closed at gallery roots and does not admit remote floor", () => {
  assert.ok(lobbyOutline().length > 100);
  assert.equal(canStand(40, 40), false);
  assert.equal(canStand(0, 12), false);
  assert.equal(canStand(8, 0), true);
});
