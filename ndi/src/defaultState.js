module.exports = {
  event: {
    name: "Panamericano de Clubes",
    status: "LIVE"
  },
  match: {
    gameId: "B5-001",
    set: 1,
    inning: 1,
    half: "TOP",
    outs: 0,
    bases: {
      first: false,
      second: false,
      third: false
    },
    teams: {
      away: {
        name: "Brazil",
        short: "BRA",
        color: "#1f9d55",
        score: 0,
        setsWon: 0
      },
      home: {
        name: "Argentina",
        short: "ARG",
        color: "#62b5e5",
        score: 0,
        setsWon: 0
      }
    }
  },
  theme: {
    ink: "#10151b",
    panel: "#17222c",
    teal: "#00a78e",
    coral: "#ff4f5e",
    gold: "#ffc83d",
    paper: "#f7f3ea",
    white: "#ffffff"
  },
  ndi: {
    sourceName: "B5 Scorebug",
    width: 1920,
    height: 1080,
    fps: 60,
    alpha: true
  }
};
