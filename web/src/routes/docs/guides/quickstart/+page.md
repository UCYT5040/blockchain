# Quickstart

## Setup Hackatime

Go to the [Hackatime Setup](https://hackatime.hackclub.com/setup).

If you don't already have an editor, this setup will help you get one.

## Install Git

You'll need Git to keep track of your work. [Get it here.](https://git-scm.com/install/)

## Create your repo

Go to [GitHub](https://github.com) and create a new repository.

Next, type this command into your terminal:

```bash
git clone <your-repo-url>
```

(where `<your-repo-url>` is the URL of the repository you just created).

## Commit your work

You should commit frequently. Aim to commit **more than once an hour**.

If your using VSCode, the source control tab will help you commit. [Learn how to use it here.](https://code.visualstudio.com/docs/sourcecontrol/overview)

Otherwise, you can use the following commands:

```bash
git add .  # stages all changed files
git commit -m "<your commit message>"
git push  # uploads your changes to GitHub
```

## Write your code

ComputerCraft: Tweaked uses Lua for programming. Create a file ending in `.lua` (e.g., `hello_world.lua`).

Try writing some Lua code:

```lua
print("Hello World!")
```

If you have a computer in the game, simply drag your Lua file onto it.

You can then run it by typing it's name into the in-game console (e.g., `hello_world`).
