from obswebsocket import obsws
from obswebsocket import requests as obsrequests

from app.utils.global_variables import get_global_variables
from app.utils.languages import text
from app.utils.logger import log

import app.buttons.obs.scenes as scene
import app.buttons.obs.recording as recording
import app.buttons.obs.streaming as stream
import app.buttons.obs.virtualcam as virtualcam
import json


#    https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
#    https://github.com/Elektordi/obs-websocket-py



def handle_command(message):
    try:
        obs_host, obs_port, obs_password = get_global_variables(("obs_host", "obs_port", "obs_password"))
        
        obs = obsws(obs_host, obs_port, obs_password)
        obs.connect()
    except Exception as e:
        if "10061" in str(e):
            log.exception(e, "Failed connection to obs: The websocket server cannot be found.", log_traceback=False)
            error = text("obs_error_10061")
        elif "password may be inco" in str(e):
            log.exception(e, "Failed connection to obs: Password may be incorrect.", log_traceback=False)
            error = text("obs_error_incorrect_password")
        else:
            error = str(e)

        raise ConnectionError(f"{text('obs_failed_connection_error').replace('.','')}: {error}")


    if message.startswith("/obs_toggle_rec"):
        recording.toggle(obs)

    elif message.startswith("/obs_start_rec"):
        recording.start(obs)

    elif message.startswith("/obs_stop_rec"):
        recording.stop(obs)


    elif message.startswith("/obs_toggle_rec_pause"):
        recording.pause_toggle(obs)

    elif message.startswith("/obs_pause_rec"):
        recording.pause(obs)
        
    elif message.startswith("/obs_resume_rec"):
        recording.resume(obs)


    elif message.startswith("/obs_toggle_stream"):
        stream.toggle(obs)

    elif message.startswith("/obs_start_stream"):
        stream.start(obs)

    elif message.startswith("/obs_stop_stream"):
        stream.stop(obs)


    elif message.startswith("/obs_toggle_virtualcam"):
        virtualcam.toggle(obs)

    elif message.startswith("/obs_start_virtualcam"):
        virtualcam.start(obs)

    elif message.startswith("/obs_stop_virtualcam"):
        virtualcam.stop(obs)


    elif message.startswith("/obs_scene"):
        scene_name = message.replace("/obs_scene", "").strip()
        scene.set(obs, scene_name)
    
    
    elif message.startswith("/obs_key"):
        raw_combination = message.split(' ')[-1]
        parts = raw_combination.split('+')
    
        # Initialize separate modifier states
        ctrl_flag = False
        shift_flag = False
        alt_flag = False
    
        primary_key = ""
    
        for part in parts:
            clean_part = part.strip().lower()
            if clean_part == 'ctrl':
                ctrl_flag = True
            elif clean_part == 'shift':
                shift_flag = True
            elif clean_part == 'alt':
                alt_flag = True
            elif clean_part != "":
                primary_key = clean_part.upper()

        formatted_key = f"OBS_KEY_{primary_key}"

        # Build the strict literal JSON payload format required by OBS Studio v5 core
        # op: 6 represents a Request payload in the OBS WebSocket v5 protocol
        raw_request = {
            "op": 6,
            "d": {
                "requestType": "TriggerHotkeyByKeySequence",
                "requestId": "webdeck_hotkey_trigger",
                "requestData": {
                    "keyId": formatted_key,
                    "keyModifiers": {
                        "shift": shift_flag,
                        "control": ctrl_flag,
                        "alt": alt_flag
                    }
                }
            }
        }

        # Convert the payload to a JSON string string and send it via the library's internal client socket
        obs.ws.send(json.dumps(raw_request))
    
        log.success(f"Hotkey combination '{raw_combination}' sent successfully to OBS.")



    obs.disconnect()