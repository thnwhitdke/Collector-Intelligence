"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState } from "react";

type Props = {
  onScan: (code: string) => void;
};

export default function BarcodeScanner({ onScan }: Props) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [cameraId, setCameraId] = useState("");

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);

        const rear =
          devices.find((d) =>
            d.label.toLowerCase().includes("back")
          ) || devices[0];

        if (rear) {
          setCameraId(rear.id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!cameraId) return;

    const scanner = new Html5Qrcode("barcode-reader");
    let active = true;

    async function startScanner() {
      try {
        await scanner.start(
          cameraId,
          {
            fps: 20,
            qrbox: {
              width: 360,
              height: 180,
            },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          async (decodedText) => {
            if (!active) return;

            active = false;

            try {
              await scanner.stop();
            } catch {}

            try {
              await scanner.clear();
            } catch {}

            onScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error(err);
      }
    }

    startScanner();

    return () => {
      active = false;

      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [cameraId, onScan]);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4">
      <div className="mb-3 text-sm text-slate-300">
        Choose camera • Rear camera recommended • Hold barcode 4–8 inches away
      </div>

      {cameras.length > 1 && (
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="mb-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-white"
        >
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id}>
              {cam.label || cam.id}
            </option>
          ))}
        </select>
      )}

      <div
        id="barcode-reader"
        className="overflow-hidden rounded-xl"
      />
    </div>
  );
}
