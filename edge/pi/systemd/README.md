# systemd units

These unit files are intended to be installed on the Raspberry Pi under:

- `/etc/systemd/system/`

They assume:

- edge python package is installed system-wide (so `/usr/local/bin/buoy-seriald` etc exist)
- runtime configuration is provided via `/etc/buoy/buoy.env`
- runtime user `buoy` exists

## Suggested enable set

- `buoy-seriald.service`
- `buoy-audio-capture.service`
- `buoy-ds18b20d.service`
- `buoy-uploader.service`
- `buoy-wave-derive.timer`

