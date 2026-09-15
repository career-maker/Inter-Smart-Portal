export interface GameLeaderboardEntry {
  id: string;
  name: string;
  role: string;
  score: number;
  formattedScore?: string;
  avatarBg: string;
  avatarText: string;
  isCurrentUser?: boolean;
}

export type GameKeyType = "runner" | "neongalaxy" | "cybermatrix" | "bugsmart" | "battleroyale" | "imposter";

export interface GameInfo {
  key: GameKeyType;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  scoreUnit: string;
}

export const GAME_INFO_MAP: Record<GameKeyType, GameInfo> = {
  runner: {
    key: "runner",
    title: "Pixel Runner",
    subtitle: "Office Obstacle Sprint",
    icon: "🏃💨",
    accentColor: "#c084fc",
    scoreUnit: "pts",
  },
  neongalaxy: {
    key: "neongalaxy",
    title: "Neon Galaxy",
    subtitle: "Star Fighter Space Arcade",
    icon: "🚀",
    accentColor: "#38bdf8",
    scoreUnit: "pts",
  },
  cybermatrix: {
    key: "cybermatrix",
    title: "Cyber Matrix",
    subtitle: "Terminal Code Breaker",
    icon: "⚡",
    accentColor: "#00ffcc",
    scoreUnit: "pts",
  },
  bugsmart: {
    key: "bugsmart",
    title: "BugSmart Bounty",
    subtitle: "Cartoon Bug Hunt & QA",
    icon: "🐞",
    accentColor: "#43ddff",
    scoreUnit: "₹ bounty",
  },
  battleroyale: {
    key: "battleroyale",
    title: "Bug Battle Royale",
    subtitle: "Team QA vs Team DEV Boss",
    icon: "👾",
    accentColor: "#fb7185",
    scoreUnit: "pts",
  },
  imposter: {
    key: "imposter",
    title: "Imposter Aircraft",
    subtitle: "Radar Squad Intercept",
    icon: "✈️",
    accentColor: "#fb923c",
    scoreUnit: "intercepts",
  },
};

// Real Inter Smart Company Employees Default Rosters
export const DEFAULT_GAME_ROSTERS: Record<GameKeyType, GameLeaderboardEntry[]> = {
  runner: [
    { id: "emp-manu", name: "Manu K O", role: "Senior UI/UX Designer", score: 285, avatarBg: "bg-indigo-600", avatarText: "MK" },
    { id: "emp-vishal", name: "Vishal Ramesh", role: "Technical Lead", score: 240, avatarBg: "bg-sky-600", avatarText: "VR" },
    { id: "emp-aswathi", name: "Aswathi M Ashok", role: "Lead QA Analyst", score: 195, avatarBg: "bg-pink-600", avatarText: "AA" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 165, avatarBg: "bg-blue-600", avatarText: "AT" },
    { id: "emp-josin", name: "Josin Joseph", role: "Full Stack Developer", score: 130, avatarBg: "bg-teal-600", avatarText: "JJ" },
    { id: "emp-ashmi", name: "Ashmi Mathew", role: "Social Media Lead", score: 95, avatarBg: "bg-amber-600", avatarText: "AM" },
    { id: "emp-gokul", name: "Gokul Shaji", role: "UI/UX Designer", score: 80, avatarBg: "bg-purple-600", avatarText: "GS" },
    { id: "emp-romine", name: "Romine George", role: "Senior Web Developer", score: 60, avatarBg: "bg-emerald-600", avatarText: "RG" },
  ],
  neongalaxy: [
    { id: "emp-vishal", name: "Vishal Ramesh", role: "Technical Lead", score: 8950, avatarBg: "bg-sky-600", avatarText: "VR" },
    { id: "emp-abhiram", name: "Abhiram P Mohan", role: "Full Stack Developer", score: 7420, avatarBg: "bg-[#56348f]", avatarText: "AP" },
    { id: "emp-josin", name: "Josin Joseph", role: "Full Stack Developer", score: 6180, avatarBg: "bg-teal-600", avatarText: "JJ" },
    { id: "emp-aswathi", name: "Aswathi M Ashok", role: "Lead QA Analyst", score: 5340, avatarBg: "bg-pink-600", avatarText: "AA" },
    { id: "emp-vishnu-s", name: "Vishnu Sasidharan", role: "Technical Architect", score: 4890, avatarBg: "bg-blue-700", avatarText: "VS" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 3920, avatarBg: "bg-blue-600", avatarText: "AT" },
    { id: "emp-gokul", name: "Gokul Shaji", role: "UI/UX Designer", score: 2850, avatarBg: "bg-purple-600", avatarText: "GS" },
    { id: "emp-sahad", name: "Sahad Rahman", role: "Full Stack Engineer", score: 1940, avatarBg: "bg-emerald-600", avatarText: "SR" },
  ],
  cybermatrix: [
    { id: "emp-vishnu-s", name: "Vishnu Sasidharan", role: "Technical Architect", score: 3250, avatarBg: "bg-blue-700", avatarText: "VS" },
    { id: "emp-manu", name: "Manu K O", role: "Senior UI/UX Designer", score: 2800, avatarBg: "bg-indigo-600", avatarText: "MK" },
    { id: "emp-jijo", name: "Jijo Jose", role: "Senior Backend Engineer", score: 2450, avatarBg: "bg-cyan-700", avatarText: "JJ" },
    { id: "emp-abhiram", name: "Abhiram P Mohan", role: "Full Stack Developer", score: 2100, avatarBg: "bg-[#56348f]", avatarText: "AP" },
    { id: "emp-aswathi", name: "Aswathi M Ashok", role: "Lead QA Analyst", score: 1850, avatarBg: "bg-pink-600", avatarText: "AA" },
    { id: "emp-akhila", name: "Akhila Mohanan", role: "QA Lead", score: 1600, avatarBg: "bg-rose-600", avatarText: "AM" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 1350, avatarBg: "bg-blue-600", avatarText: "AT" },
    { id: "emp-soumya", name: "Soumya S Kumar", role: "Senior QA Engineer", score: 950, avatarBg: "bg-violet-600", avatarText: "SK" },
  ],
  bugsmart: [
    { id: "emp-aswathi", name: "Aswathi M Ashok", role: "Lead QA Analyst", score: 5200, formattedScore: "₹5,200", avatarBg: "bg-pink-600", avatarText: "AA" },
    { id: "emp-akhila", name: "Akhila Mohanan", role: "QA Lead", score: 4800, formattedScore: "₹4,800", avatarBg: "bg-rose-600", avatarText: "AM" },
    { id: "emp-soumya", name: "Soumya S Kumar", role: "Senior QA Engineer", score: 4100, formattedScore: "₹4,100", avatarBg: "bg-violet-600", avatarText: "SK" },
    { id: "emp-bindhu-s", name: "Bindhu Shenoy", role: "Senior Project Coordinator", score: 3600, formattedScore: "₹3,600", avatarBg: "bg-orange-600", avatarText: "BS" },
    { id: "emp-jissa", name: "Jissa Joseph", role: "Senior Content Strategist", score: 3100, formattedScore: "₹3,100", avatarBg: "bg-amber-600", avatarText: "JJ" },
    { id: "emp-bonies", name: "Bonies Doyal", role: "Senior Project Manager", score: 2700, formattedScore: "₹2,700", avatarBg: "bg-emerald-600", avatarText: "BD" },
    { id: "emp-ashmi", name: "Ashmi Mathew", role: "Social Media Lead", score: 2200, formattedScore: "₹2,200", avatarBg: "bg-pink-500", avatarText: "AM" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 1800, formattedScore: "₹1,800", avatarBg: "bg-blue-600", avatarText: "AT" },
  ],
  battleroyale: [
    { id: "emp-team-qa", name: "Aswathi M Ashok", role: "Lead QA Analyst (Team QA)", score: 4600, avatarBg: "bg-rose-600", avatarText: "AA" },
    { id: "emp-team-dev", name: "Vishal Ramesh", role: "Technical Lead (Team DEV)", score: 4350, avatarBg: "bg-blue-600", avatarText: "VR" },
    { id: "emp-vishnu-s", name: "Vishnu Sasidharan", role: "Technical Architect", score: 3900, avatarBg: "bg-indigo-600", avatarText: "VS" },
    { id: "emp-manu", name: "Manu K O", role: "Senior UI/UX Designer", score: 3450, avatarBg: "bg-amber-600", avatarText: "MK" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 2900, avatarBg: "bg-teal-600", avatarText: "AT" },
    { id: "emp-ashmi", name: "Ashmi Mathew", role: "Social Media Lead", score: 2400, avatarBg: "bg-pink-600", avatarText: "AM" },
    { id: "emp-sunil", name: "Sunil Anurudhan", role: "Digital Marketing Strategist", score: 1950, avatarBg: "bg-emerald-600", avatarText: "SA" },
    { id: "emp-nobby", name: "Nobby Pachat", role: "Operations Executive", score: 1500, avatarBg: "bg-purple-600", avatarText: "NP" },
  ],
  imposter: [
    { id: "emp-bonies", name: "Bonies Doyal", role: "Senior Project Manager", score: 26, formattedScore: "26 jets", avatarBg: "bg-emerald-600", avatarText: "BD" },
    { id: "emp-vishal", name: "Vishal Ramesh", role: "Technical Lead", score: 23, formattedScore: "23 jets", avatarBg: "bg-sky-600", avatarText: "VR" },
    { id: "emp-aswathi", name: "Aswathi M Ashok", role: "Lead QA Analyst", score: 19, formattedScore: "19 jets", avatarBg: "bg-pink-600", avatarText: "AA" },
    { id: "emp-amal", name: "Amal Tomy", role: "System Administrator", score: 16, formattedScore: "16 jets", avatarBg: "bg-blue-600", avatarText: "AT" },
    { id: "emp-manu", name: "Manu K O", role: "Senior UI/UX Designer", score: 14, formattedScore: "14 jets", avatarBg: "bg-indigo-600", avatarText: "MK" },
    { id: "emp-abhiram", name: "Abhiram P Mohan", role: "Full Stack Developer", score: 12, formattedScore: "12 jets", avatarBg: "bg-[#56348f]", avatarText: "AP" },
    { id: "emp-sunil", name: "Sunil Anurudhan", role: "Digital Marketing Strategist", score: 9, formattedScore: "9 jets", avatarBg: "bg-amber-600", avatarText: "SA" },
    { id: "emp-mercy", name: "Mercy Nelson", role: "HR & Administrative Head", score: 7, formattedScore: "7 jets", avatarBg: "bg-purple-600", avatarText: "MN" },
  ],
};

const STORAGE_PREFIX = "iss_workplace_game_lb_v3_";

export interface CurrentUserInfo {
  id?: string | number;
  name?: string;
  role?: string;
  initials?: string;
}

/**
 * Normalizes and deduplicates leaderboard entries.
 * Ensures the logged-in user is present ONLY ONCE and flagged isCurrentUser = true.
 */
export function getGameLeaderboard(
  gameKey: GameKeyType,
  currentUser: CurrentUserInfo
): GameLeaderboardEntry[] {
  if (typeof window === "undefined") {
    return DEFAULT_GAME_ROSTERS[gameKey] || [];
  }

  const currentUserId = currentUser.id ? String(currentUser.id) : "user-current";
  const currentUserName = (currentUser.name || "Abhiram P Mohan").trim();
  const currentUserRole = currentUser.role || "Lead QA Analyst";
  const currentUserInitials = currentUser.initials || "AP";

  const storageKey = `${STORAGE_PREFIX}${gameKey}`;
  let entries: GameLeaderboardEntry[] = [];

  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      entries = JSON.parse(raw);
    } catch {
      entries = [];
    }
  }

  if (!entries || entries.length === 0) {
    // Seed from default roster
    entries = JSON.parse(JSON.stringify(DEFAULT_GAME_ROSTERS[gameKey] || []));
  }

  // Check saved personal high score in localStorage (like runner or neon galaxy high)
  let savedPersonalHigh = 0;
  if (gameKey === "runner") {
    savedPersonalHigh = parseInt(localStorage.getItem("iss_offline_game_highscore") || "0", 10);
  } else if (gameKey === "neongalaxy") {
    savedPersonalHigh = parseInt(localStorage.getItem("neon_galaxy_high") || "0", 10);
  } else if (gameKey === "cybermatrix") {
    savedPersonalHigh = parseInt(localStorage.getItem("cyber_matrix_high") || "0", 10);
  }

  // Deduplicate strictly by normalized name (lowercase without extra spaces)
  const normCurrent = currentUserName.toLowerCase().replace(/\s+/g, " ");

  // Find if current user is already among seed employees or previous entries
  let foundUserEntry: GameLeaderboardEntry | null = null;
  const filteredColleagues: GameLeaderboardEntry[] = [];
  const seenNames = new Set<string>();

  for (const entry of entries) {
    const normName = (entry.name || "").toLowerCase().replace(/\s+/g, " ");
    if (seenNames.has(normName)) continue; // skip duplicates
    seenNames.add(normName);

    const isMatch =
      entry.isCurrentUser ||
      entry.id === currentUserId ||
      normName === normCurrent ||
      normName.includes(normCurrent) ||
      normCurrent.includes(normName);

    if (isMatch) {
      if (!foundUserEntry) {
        foundUserEntry = {
          ...entry,
          id: currentUserId,
          name: currentUserName,
          role: currentUserRole,
          isCurrentUser: true,
          score: Math.max(entry.score || 0, savedPersonalHigh),
          avatarBg: "bg-[#56348f]",
          avatarText: currentUserInitials,
        };
      } else {
        // take maximum score if already found
        foundUserEntry.score = Math.max(foundUserEntry.score, entry.score || 0, savedPersonalHigh);
      }
    } else {
      filteredColleagues.push({
        ...entry,
        isCurrentUser: false,
      });
    }
  }

  if (!foundUserEntry) {
    foundUserEntry = {
      id: currentUserId,
      name: currentUserName,
      role: currentUserRole,
      isCurrentUser: true,
      score: savedPersonalHigh,
      avatarBg: "bg-[#56348f]",
      avatarText: currentUserInitials,
    };
  }

  // Combine single user entry + colleagues
  const result = [foundUserEntry, ...filteredColleagues];
  result.sort((a, b) => b.score - a.score);

  // Cache back cleaned and deduped result
  try {
    localStorage.setItem(storageKey, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Record a new score for the current user and update leaderboard
 */
export function recordGameScore(
  gameKey: GameKeyType,
  score: number,
  currentUser: CurrentUserInfo
): GameLeaderboardEntry[] {
  if (typeof window === "undefined" || score <= 0) {
    return getGameLeaderboard(gameKey, currentUser);
  }

  const currentUserId = currentUser.id ? String(currentUser.id) : "user-current";
  const currentUserName = (currentUser.name || "Abhiram P Mohan").trim();
  const currentUserRole = currentUser.role || "Lead QA Analyst";
  const currentUserInitials = currentUser.initials || "AP";

  const currentList = getGameLeaderboard(gameKey, currentUser);

  const updated = currentList.map((entry) => {
    if (entry.isCurrentUser || entry.id === currentUserId) {
      return {
        ...entry,
        id: currentUserId,
        name: currentUserName,
        role: currentUserRole,
        score: Math.max(entry.score, score),
        isCurrentUser: true,
        avatarBg: "bg-[#56348f]",
        avatarText: currentUserInitials,
      };
    }
    return entry;
  });

  updated.sort((a, b) => b.score - a.score);

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${gameKey}`, JSON.stringify(updated));
    if (gameKey === "runner") {
      const prevHs = parseInt(localStorage.getItem("iss_offline_game_highscore") || "0", 10);
      localStorage.setItem("iss_offline_game_highscore", Math.max(prevHs, score).toString());
      localStorage.setItem("iss_offline_game_leaderboard_v2", JSON.stringify(updated));
    } else if (gameKey === "neongalaxy") {
      localStorage.setItem("neon_galaxy_high", Math.max(parseInt(localStorage.getItem("neon_galaxy_high") || "0", 10), score).toString());
    } else if (gameKey === "cybermatrix") {
      localStorage.setItem("cyber_matrix_high", Math.max(parseInt(localStorage.getItem("cyber_matrix_high") || "0", 10), score).toString());
    }
  } catch {}

  return updated;
}
