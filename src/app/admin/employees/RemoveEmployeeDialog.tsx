"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export interface RemovableEmployee {
  id: string;
  name: string;
  username: string;
  status: string;
  _count: { sales: number; meterReadings: number };
}

interface Props {
  employee: RemovableEmployee;
  onClose: () => void;
  /** Called after the employee was removed or disabled. */
  onChanged: (result: "removed" | "disabled") => void;
}

export function RemoveEmployeeDialog({ employee, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sales, meterReadings } = employee._count;
  const hasHistory = sales > 0 || meterReadings > 0;

  async function remove() {
    setBusy(true);
    setError(null);
    const query = hasHistory ? "?deleteHistory=true" : "";
    const res = await fetch(`/api/employees/${employee.id}${query}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not remove this employee.");
      return;
    }
    onChanged("removed");
  }

  async function disableInstead() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISABLED" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not disable this employee.");
      return;
    }
    onChanged("disabled");
  }

  return (
    <ConfirmDialog
      title={`Remove ${employee.name}?`}
      confirmLabel={hasHistory ? "Delete All" : "Remove"}
      busy={busy}
      error={error}
      requireText={hasHistory ? employee.username : undefined}
      onConfirm={remove}
      onCancel={onClose}
    >
      {hasHistory ? (
        <>
          <p>
            This employee has <strong>{sales} sale{sales === 1 ? "" : "s"}</strong> and{" "}
            <strong>
              {meterReadings} meter reading{meterReadings === 1 ? "" : "s"}
            </strong>
            . Removing them permanently deletes those records too, and past revenue reports will change.
          </p>
          {employee.status === "ACTIVE" && (
            <p>
              To keep the records, disable the account instead.{" "}
              <button
                type="button"
                onClick={disableInstead}
                disabled={busy}
                className="font-semibold text-cyan-700 underline disabled:opacity-60"
              >
                Disable account
              </button>
            </p>
          )}
        </>
      ) : (
        <p>This employee has no sales or meter readings. This cannot be undone.</p>
      )}
    </ConfirmDialog>
  );
}
