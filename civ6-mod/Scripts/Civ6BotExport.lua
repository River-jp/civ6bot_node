-- Civ6 Bot Exporter shared export logic.

Civ6BotExport = Civ6BotExport or {}
local Exporter = Civ6BotExport

local EXPORT_PREFIX = "CIV6BOT_EXPORT:"

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

local function CallMethod(object, methodName, defaultValue)
  if object == nil or type(object[methodName]) ~= "function" then
    return defaultValue
  end

  local ok, value = pcall(object[methodName], object)
  if ok then
    return value
  end

  return defaultValue
end

local function CallFunction(fn, defaultValue)
  if type(fn) ~= "function" then
    return defaultValue
  end

  local ok, value = pcall(fn)
  if ok then
    return value
  end

  return defaultValue
end

local function CurrentPlayer()
  local playerId = CallFunction(Game and Game.GetLocalPlayer, -1)
  if playerId == -1 or Players == nil then
    return nil
  end

  return Players[playerId]
end

local function PlayerSummary(player)
  local playerId = CallMethod(player, "GetID", -1)
  local config = PlayerConfigurations and PlayerConfigurations[playerId] or nil
  local treasury = CallMethod(player, "GetTreasury", nil)
  local religion = CallMethod(player, "GetReligion", nil)
  local techs = CallMethod(player, "GetTechs", nil)
  local culture = CallMethod(player, "GetCulture", nil)

  return table.concat({
    "\"civilization\":" .. JsonString(CallMethod(config, "GetCivilizationTypeName", "")),
    "\"leader\":" .. JsonString(CallMethod(config, "GetLeaderTypeName", "")),
    "\"score\":" .. tostring(CallMethod(player, "GetScore", 0) or 0),
    "\"gold\":" .. tostring(CallMethod(treasury, "GetGoldBalance", 0) or 0),
    "\"faith\":" .. tostring(CallMethod(religion, "GetFaithBalance", 0) or 0),
    "\"sciencePerTurn\":" .. tostring(CallMethod(techs, "GetScienceYield", 0) or 0),
    "\"culturePerTurn\":" .. tostring(CallMethod(culture, "GetCultureYield", 0) or 0)
  }, ",")
end

local function CitiesJson(player)
  local parts = {}
  local cities = CallMethod(player, "GetCities", nil)
  if cities == nil or type(cities.Members) ~= "function" then
    return "[]"
  end

  for _, city in cities:Members() do
    local buildQueue = CallMethod(city, "GetBuildQueue", nil)
    local currentProduction = CallMethod(buildQueue, "GetCurrentProductionTypeHash", "")
    table.insert(parts, "{" .. table.concat({
      "\"name\":" .. JsonString(CallMethod(city, "GetName", "")),
      "\"population\":" .. tostring(CallMethod(city, "GetPopulation", 0) or 0),
      "\"production\":" .. JsonString(currentProduction or ""),
      "\"turnsRemaining\":" .. tostring(CallMethod(buildQueue, "GetTurnsLeft", 0) or 0)
    }, ",") .. "}")
  end

  return "[" .. table.concat(parts, ",") .. "]"
end

local function UnitsJson(player)
  local parts = {}
  local units = CallMethod(player, "GetUnits", nil)
  if units == nil or type(units.Members) ~= "function" then
    return "[]"
  end

  for _, unit in units:Members() do
    local unitType = CallMethod(unit, "GetType", -1)
    local unitInfo = GameInfo and GameInfo.Units and GameInfo.Units[unitType] or nil
    local damage = CallMethod(unit, "GetDamage", 0) or 0
    table.insert(parts, "{" .. table.concat({
      "\"type\":" .. JsonString(unitInfo and unitInfo.UnitType or ""),
      "\"x\":" .. tostring(CallMethod(unit, "GetX", 0) or 0),
      "\"y\":" .. tostring(CallMethod(unit, "GetY", 0) or 0),
      "\"health\":" .. tostring(100 - damage),
      "\"moves\":" .. tostring(CallMethod(unit, "GetMovesRemaining", 0) or 0)
    }, ",") .. "}")
  end

  return "[" .. table.concat(parts, ",") .. "]"
end

local function ResolveTurn()
  local currentTurn = CallFunction(Game and Game.GetCurrentGameTurn, nil)
  if type(currentTurn) == "number" then
    return currentTurn
  end

  local gameTurn = CallFunction(Game and Game.GetGameTurn, nil)
  if type(gameTurn) == "number" then
    return gameTurn
  end

  return 0
end

local function ResolveYear()
  local year = CallFunction(Game and Game.GetGameTurnYear, nil)
  if year ~= nil then
    return year
  end

  return ""
end

local function ResolveEra()
  local eras = CallFunction(Game and Game.GetEras, nil)
  local era = CallMethod(eras, "GetCurrentEra", nil)
  if era ~= nil then
    return era
  end

  return -1
end

function Exporter.Export()
  local player = CurrentPlayer()
  if player == nil then
    print("Civ6Bot: no local player")
    return
  end

  local json = "{" .. table.concat({
    "\"exportVersion\":1",
    "\"turn\":" .. tostring(ResolveTurn()),
    "\"year\":" .. JsonString(ResolveYear()),
    "\"era\":" .. JsonString(ResolveEra()),
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

function Exporter.SafeExport(reason)
  local ok, err = pcall(Exporter.Export)
  if not ok then
    print("Civ6Bot: export failed during " .. tostring(reason) .. ": " .. tostring(err))
  end
end

return Exporter
