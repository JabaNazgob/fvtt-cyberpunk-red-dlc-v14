Hooks.on("babele.init", () => {
  for (const langObj of game.system.languages) {
    const lang = langObj.lang;
    game.babele.register({
      module: "cyberpunk-red-dlc",
      lang: lang,
      dir: `babele/${lang}`,
    });
  }
});
