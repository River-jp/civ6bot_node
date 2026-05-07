-- Civ6 Bot Exporter
-- Prints one tagged JSON line to Lua.log. The Node companion watches this tag.

local EXPORT_PREFIX = "CIV6BOT_EXPORT:"
local HOTKEY = Keys.VK_F8

local function JsonEscape(value)
  value = tostring(value or "")
  value = string.gsub(value, "\\", "\\\\")
  value = string.gsub(value, "\"", "\\\"")
  value = string.gsub(value, "\n", "\\n")
  value = string.gsub(value, "\r", "\\r")
  return value
end

local function JsonString(value)
  return "\"" .. JsonEscape(value) .. "\""
end

local function JsonArray(values)
  local parts = {}
  for _, value in ipairs(values) do
    table.insert(parts, JsonString(value))
  end
  return "[" .. table.concat(parts, ",") .. "]"
end

local function CurrentPlayer()
  local playerId = Game.GetLocalPlayer()
  if playerId == -1 then
    return nil
  end
  return Players[playerId]
end

local function PlayerSummary(player)
  local config = PlayerConfigurations[player:GetID()]
  local treasury = player:GetTreasury()
  local religion = player:GetReligion()
  local techs = player:GetTechs()
  local culture = player:GetCulture()

  return table.concat({
    "\"civilization\":" .. JsonString(config and config:GetCivilizationTypeName() or ""),
    "\"leader\":" .. JsonString(config and config:GetLeaderTypeName() or ""),
    "\"score\":" .. tostring(player:GetScore() or 0),
    "\"gold\":" .. tostring(treasury and treasury:GetGoldBalance() or 0),
    "\"faith\":" .. tostring(religion and religion:GetFaithBalance() or 0),
    "\"sciencePerTurn\":" .. tostring(techs and techs:GetScienceYield() or 0),
    "\"culturePerTurn\":" .. tostring(culture and culture:GetCultureYield() or 0)
  }, ",")
end

local function CitiesJson(player)
  local parts = {}
  local cities = player:GetCities()
  for _, city in cities:Members() do
    local buildQueue = city:GetBuildQueue()
    local currentProduction = buildQueue and buildQueue:GetCurrentProductionTypeHash()
    table.insert(parts, "{" .. table.concat({
      "\"name\":" .. JsonString(city:GetName()),
      "\"population\":" .. tostring(city:GetPopulation() or 0),
      "\"production\":" .. JsonString(currentProduction or ""),
      "\"turnsRemaining\":" .. tostring(buildQueue and buildQueue:GetTurnsLeft() or 0)
    }, ",") .. "}")
  end
  return "[" .. table.concat(parts, ",") .. "]"
end

local function UnitsJson(player)
  local parts = {}
  local units = player:GetUnits()
  for _, unit in units:Members() do
    table.insert(parts, "{" .. table.concat({
      "\"type\":" .. JsonString(GameInfo.Units[unit:GetType()] and GameInfo.Units[unit:GetType()].UnitType or ""),
      "\"x\":" .. tostring(unit:GetX() or 0),
      "\"y\":" .. tostring(unit:GetY() or 0),
      "\"health\":" .. tostring(unit:GetDamage() and (100 - unit:GetDamage()) or 100),
      "\"moves\":" .. tostring(unit:GetMovesRemaining() or 0)
    }, ",") .. "}")
  end
  return "[" .. table.concat(parts, ",") .. "]"
end

local function Export()
  local player = CurrentPlayer()
  if player == nil then
    print("Civ6Bot: no local player")
    return
  end

  local gameEra = Game.GetEras() and Game.GetEras():GetCurrentEra() or -1
  local year = Game.GetGameTurnYear and Game.GetGameTurnYear() or ""
  local json = "{" .. table.concat({
    "\"exportVersion\":1",
    "\"turn\":" .. tostring(Game.GetCurrentGameTurn()),
    "\"year\":" .. JsonString(year),
    "\"era\":" .. JsonString(gameEra),
    "\"player\":{" .. PlayerSummary(player) .. "}",
    "\"cities\":" .. CitiesJson(player),
    "\"units\":" .. UnitsJson(player),
    "\"technologies\":[]",
    "\"civics\":[]",
    "\"resources\":{}",
    "\"diplomacy\":[]"
  }, ",") .. "}"

  print(EXPORT_PREFIX .. json)
end

local function OnInputActionTriggered(actionId)
  if actionId == HOTKEY then
    Export()
  end
end

if Events.InputActionTriggered ~= nil then
  Events.InputActionTriggered.Add(OnInputActionTriggered)
end

print("Civ6Bot Exporter loaded. Press F8 to export local state.")
