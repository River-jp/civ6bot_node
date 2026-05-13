-- Civ6 Bot Exporter UI hotkey bridge.
-- This file runs in an InGame UI context, where ContextPtr can receive input.

local HOTKEY = (Keys and Keys.VK_F8) or 119
local DEBUG_KEY_EVENTS = true
local debugKeyEventCount = 0

local function RequestExport()
  print("Civ6Bot: F8 export triggered")

  if LuaEvents == nil then
    print("Civ6Bot: LuaEvents is unavailable; F8 export skipped")
    return
  end

  local hook = LuaEvents.Civ6BotExportRequest
  if type(hook) == "function" then
    hook("ui hotkey")
    return
  end

  if type(hook) == "table" and type(hook.Call) == "function" then
    hook:Call("ui hotkey")
    return
  end

  print("Civ6Bot: Civ6BotExportRequest event is unavailable; F8 export skipped")
end

local function IsKeyEvent(uiMsg)
  return KeyEvents ~= nil and (uiMsg == KeyEvents.KeyDown or uiMsg == KeyEvents.KeyUp)
end

local function IsHotkeyEvent(uiMsg, wParam)
  if wParam ~= HOTKEY then
    return false
  end

  if KeyEvents == nil then
    return true
  end

  return uiMsg == KeyEvents.KeyDown or uiMsg == KeyEvents.KeyUp
end

local function LogKeyEvent(uiMsg, wParam, lParam)
  if not DEBUG_KEY_EVENTS or debugKeyEventCount >= 20 or not IsKeyEvent(uiMsg) then
    return
  end

  debugKeyEventCount = debugKeyEventCount + 1
  print("Civ6Bot: key event debug uiMsg=" .. tostring(uiMsg)
    .. " wParam=" .. tostring(wParam)
    .. " lParam=" .. tostring(lParam)
    .. " hotkey=" .. tostring(HOTKEY)
    .. " keyDown=" .. tostring(KeyEvents and KeyEvents.KeyDown)
    .. " keyUp=" .. tostring(KeyEvents and KeyEvents.KeyUp))
end

if ContextPtr ~= nil and type(ContextPtr.SetInputHandler) == "function" then
  ContextPtr:SetInputHandler(function(uiMsg, wParam, lParam)
    LogKeyEvent(uiMsg, wParam, lParam)

    if IsHotkeyEvent(uiMsg, wParam) then
      RequestExport()
      return true
    end

    return false
  end)
  print("Civ6Bot: UI input handler registered for F8; hotkey=" .. tostring(HOTKEY))
else
  print("Civ6Bot: ContextPtr input handler is unavailable in UI context")
end
