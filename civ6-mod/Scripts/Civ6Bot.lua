-- Civ6 Bot Exporter gameplay entry point.

local function LoadExporter()
  local names = {
    "Civ6BotExport",
    "Scripts/Civ6BotExport",
    "Civ6BotExport.lua",
    "Scripts/Civ6BotExport.lua"
  }

  for _, name in ipairs(names) do
    local ok, result = pcall(include, name)
    local exporter = result or Civ6BotExport
    if ok and exporter ~= nil and type(exporter.SafeExport) == "function" then
      print("Civ6Bot: export module loaded via " .. name)
      return exporter
    end
  end

  return Civ6BotExport
end

local Exporter = LoadExporter()
local HOTKEY = (Keys and Keys.VK_F8) or 119

local function SafeExport(reason)
  if Exporter == nil or type(Exporter.SafeExport) ~= "function" then
    Exporter = LoadExporter()
  end

  if Exporter ~= nil and type(Exporter.SafeExport) == "function" then
    Exporter.SafeExport(reason)
  else
    print("Civ6Bot: export module is unavailable")
  end
end

local function OnInputActionTriggered(actionId)
  local action = tostring(actionId)
  if actionId == HOTKEY or action == tostring(HOTKEY) or action == "F8" or action == "VK_F8" then
    print("Civ6Bot: F8 export triggered")
    SafeExport("gameplay hotkey")
  end
end

local function OnLocalPlayerTurnBegin(playerId)
  if Game == nil or type(Game.GetLocalPlayer) ~= "function" then
    return
  end

  local ok, localPlayerId = pcall(Game.GetLocalPlayer)
  if ok and playerId == localPlayerId then
    SafeExport("local turn begin")
  end
end

if Events.InputActionTriggered ~= nil then
  Events.InputActionTriggered.Add(OnInputActionTriggered)
else
  print("Civ6Bot: Events.InputActionTriggered is unavailable; F8 hotkey export disabled")
end

if LuaEvents ~= nil and LuaEvents.Civ6BotExportRequest ~= nil and type(LuaEvents.Civ6BotExportRequest.Add) == "function" then
  LuaEvents.Civ6BotExportRequest.Add(function(reason)
    SafeExport(reason or "lua event")
  end)
  print("Civ6Bot: LuaEvents export request handler registered")
end

if Events.LocalPlayerTurnBegin ~= nil then
  Events.LocalPlayerTurnBegin.Add(OnLocalPlayerTurnBegin)
elseif Events.TurnBegin ~= nil then
  Events.TurnBegin.Add(function()
    SafeExport("turn begin")
  end)
end

print("Civ6Bot Exporter loaded. Press F8 to export local state.")
SafeExport("initial load")
