# SIM / 4G and Connectivity Notes

## Handover network

- Pi uploads to laptop backend over **Tailscale** (not public cloud for Friday)
- 4G HAT / PiTalk provides internet when Wi-Fi unavailable
- Prove 4G registration after **reboot** before leaving Pi unattended

## Diagnostics

```bash
edge/pi/scripts/pi_network_check.sh
edge/pi/scripts/pi_tailscale_check.sh
edge/pi/scripts/pi_connectivity_watch.sh
```

## Fill in for supervisors

See [HANDOVER_PARTS_COST_SIM_CHECKLIST.md](HANDOVER_PARTS_COST_SIM_CHECKLIST.md) for SIM provider, monthly cost, account owner, APN, and replacement plan.

## Future cloud stage

The same API and uploader can target a cloud-hosted backend for demos; Friday handover uses the laptop backend only.
