-- Civ6 Bot Exporter WorldInput hook.
-- Replaces the WorldInput script, loads the base implementation, then wraps
-- DefaultKeyUpHandler so F8 is handled in the normal in-game input path.

include("WorldInput")

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
      print("Civ6Bot: export module loaded in WorldInput via " .. name)
      return exporter
    end
  end

  return Civ6BotExport
end

local Exporter = LoadExporter()
local HOTKEY = (Keys and Keys.VK_F8) or 119
local BASE_CIV6BOT_DefaultKeyUpHandler = DefaultKeyUpHandler

local function RequestExport()
  print("Civ6Bot: F8 export triggered from WorldInput")

  if Exporter == nil or type(Exporter.SafeExport) ~= "function" then
    Exporter = LoadExporter()
  end

  if Exporter ~= nil and type(Exporter.SafeExport) == "function" then
    Exporter.SafeExport("worldinput hotkey")
    return true
  end

  print("Civ6Bot: export module is unavailable in WorldInput")
  return false
end

function DefaultKeyUpHandler(uiKey)
  if uiKey == HOTKEY then
    return RequestExport()
  end

  if type(BASE_CIV6BOT_DefaultKeyUpHandler) == "function" then
    return BASE_CIV6BOT_DefaultKeyUpHandler(uiKey)
  end

  return false
end

print("Civ6Bot: WorldInput F8 hook registered; hotkey=" .. tostring(HOTKEY))
