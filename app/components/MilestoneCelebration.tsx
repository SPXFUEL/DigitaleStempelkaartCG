"use client";

import { useEffect, useRef } from "react";

interface Props {
  customerId: string;
  stamps: number;
  rewardAvailable: boolean;
  totalDrinks: number;
  totalRewards: number;
  birthdayActive: boolean;
}

interface Snapshot {
  stamps: number;
  rewardAvailable: boolean;
  totalDrinks: number;
  totalRewards: number;
  birthdayActive: boolean;
}

function storageKey(customerId: string) {
  return `cg:milestone:${customerId}`;
}

function readPrev(customerId: string): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(customerId));
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function writePrev(customerId: string, snap: Snapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(customerId), JSON.stringify(snap));
  } catch {
    /* quota / private mode — geen probleem */
  }
}

/**
 * Detecteert "wat is er nieuw sinds de laatste keer dat ik deze pagina zag"
 * en triggert de bijbehorende viering.
 */
type Trigger =
  | { kind: "stamp"; total: number }
  | { kind: "reward_unlocked" }
  | { kind: "reward_redeemed" }
  | { kind: "lifetime_milestone"; value: number }
  | { kind: "birthday" };

function detectTrigger(prev: Snapshot | null, curr: Snapshot): Trigger | null {
  if (!prev) {
    // Eerste keer dat we deze klant zien op deze browser. Geen viering
    // bij eerste paint (laat de baseline gewoon vastleggen).
    if (curr.birthdayActive) return { kind: "birthday" };
    return null;
  }

  if (curr.birthdayActive && !prev.birthdayActive) {
    return { kind: "birthday" };
  }

  // Reward net unlocked?
  if (curr.rewardAvailable && !prev.rewardAvailable) {
    return { kind: "reward_unlocked" };
  }

  // Reward net ingewisseld?
  if (
    !curr.rewardAvailable &&
    prev.rewardAvailable &&
    curr.totalRewards > prev.totalRewards
  ) {
    return { kind: "reward_redeemed" };
  }

  // Nieuwe stempel?
  if (curr.stamps > prev.stamps) {
    return { kind: "stamp", total: curr.stamps };
  }

  // Lifetime milestone (10, 25, 50, 100, ...)
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  for (const m of milestones) {
    if (prev.totalDrinks < m && curr.totalDrinks >= m) {
      return { kind: "lifetime_milestone", value: m };
    }
  }

  return null;
}

async function fire(trigger: Trigger) {
  const { default: confetti } = await import("canvas-confetti");

  const coffee = ["#5b3a1f", "#3d2817", "#8a5a3b"];
  const leaf = ["#5c8d5b", "#3f6b3e", "#8db58c"];
  const festive = ["#f5d99a", "#e8c170", "#5c8d5b", "#5b3a1f"];

  switch (trigger.kind) {
    case "stamp": {
      // Kleine burst vanaf onderin
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x: 0.5, y: 0.9 },
        colors: coffee,
        scalar: 0.8,
        ticks: 120,
      });
      break;
    }
    case "reward_unlocked": {
      // Grote viering: kaart vol
      const duration = 1800;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 6,
          startVelocity: 30,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors: festive,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      break;
    }
    case "reward_redeemed": {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.6 },
        colors: leaf,
        ticks: 200,
      });
      break;
    }
    case "lifetime_milestone": {
      // Cijfer-milestone, beide kanten
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: festive,
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: festive,
      });
      break;
    }
    case "birthday": {
      // Verjaardags-feest
      const end = Date.now() + 2400;
      (function frame() {
        confetti({
          particleCount: 5,
          startVelocity: 20,
          spread: 60,
          origin: { x: Math.random(), y: 0 },
          colors: ["#f5d99a", "#e8c170", "#ff6b6b", "#5c8d5b"],
          gravity: 0.6,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      break;
    }
  }
}

export default function MilestoneCelebration({
  customerId,
  stamps,
  rewardAvailable,
  totalDrinks,
  totalRewards,
  birthdayActive,
}: Props) {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const curr: Snapshot = {
      stamps,
      rewardAvailable,
      totalDrinks,
      totalRewards,
      birthdayActive,
    };
    const prev = readPrev(customerId);
    const trigger = detectTrigger(prev, curr);
    writePrev(customerId, curr);

    if (trigger) {
      // Wacht 1 frame zodat de pagina al gepaint is
      requestAnimationFrame(() => {
        void fire(trigger);
      });
    }
  }, [
    customerId,
    stamps,
    rewardAvailable,
    totalDrinks,
    totalRewards,
    birthdayActive,
  ]);

  return null;
}
