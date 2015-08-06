describe("Turns", function() {
    var game;
    beforeEach(function() {
        game = new Game("game");
        game.addTeam(new Team());
        game.addTeam(new Team());
    });

    describe("Generate a Turn immediately when the Game Starts", function () {
        var spyEvent;
        beforeEach(function() {
            spyEvent = spyOnEvent("#game", "generateTurn");
        });
        it("Game starting", function () {
            game.handler.trigger("setState", "GameStarted");
            expect(spyEvent).toHaveBeenTriggered();
        });
        it("- Turn Number > 0", function () {
            game.turnNumber = 1;
            game.handler.trigger("setState", "GameStarted");
            expect(spyEvent).not.toHaveBeenTriggered();
        });
        it("- Game not started yet", function () {
            game.handler.trigger("setState", "WaitingForRequiredPlayers");
            expect(spyEvent).not.toHaveBeenTriggered();
        });
    });
    describe("Do not allow Turns after the Game Ended", function () {
        it("End game & generate turn", function () {
            game.handler.trigger("setState", "GameEnded");
            game.handler.trigger("generateTurn");
            expect(game.turnNumber).toBe(0);
        });
        it("- Generate turns when game hasn't ended", function () {
            game.handler.trigger("setState", "ObjectiveStarted");
            game.handler.trigger("generateTurn");
            expect(game.turnNumber).toBe(1);
        });
    });
    describe("A turn at Game Started changes the State to Objective Started", function () {
        it("Trigger game start", function () {
            spyOn(Rules, "meetObjectiveRequirements").and.returnValue(-1);
            game.handler.trigger("setState", "GameStarted");
            expect(game.state).toBe("ObjectiveStarted");
        });
        it("- Wait for players", function () {
            game.handler.trigger("setState", "WaitingForRequiredPlayers");
            game.handler.trigger("generateTurn");
            expect(game.state).not.toBe("ObjectiveStarted");
        });
    });
    describe("Generating a Turn should increase the Turn Number by 1", function () {
        it("Start game", function () {
            expect(game.turnNumber).toBe(0);
            game.handler.trigger("setState", "GameStarted");
            expect(game.turnNumber).toBe(1);
        });
        it("Generate turns", function () {
            game.handler.trigger("generateTurn");
            expect(game.turnNumber).toBe(1);
            game.handler.trigger("generateTurn");
            expect(game.turnNumber).toBe(2);
            game.handler.trigger("generateTurn");
            expect(game.turnNumber).toBe(3);
        });
    });
});