"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import JoinMeetingButton from "./JoinMeetingButton";

export default function AppointmentDetails({ appointment }) {
  const [open, setOpen] = useState(false);

  const canJoinMeeting = (() => {
    if (appointment.status !== "confirmed") return false;

    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}:00`
    );
    const now = new Date();

    const diffInMinutes =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

    return diffInMinutes <= 30 && diffInMinutes > -60;
  })();

  return (
    <>
      <Button
        variant="outline"
        className="text-sm rounded-lg"
        onClick={() => setOpen(true)}
      >
        View Details
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Appointment Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm mt-2">
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="font-medium">🧑‍🤝‍🧑 {appointment.patientId?.name}</p>
              {appointment.patientId?.email && (
                <p className="text-muted-foreground">
                  {appointment.patientId.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {new Date(appointment.date).toLocaleDateString()}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-semibold">{appointment.time}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Consultation Fee</p>
              <p className="font-semibold">₹{appointment.amount}</p>
            </div>

            <div className="flex gap-2">
              <span
                className={`px-3 py-1 text-xs rounded-full font-medium ${
                  appointment.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : appointment.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Status: {appointment.status}
              </span>

              <span
                className={`px-3 py-1 text-xs rounded-full font-medium ${
                  appointment.paymentStatus === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Payment: {appointment.paymentStatus}
              </span>
            </div>

            {canJoinMeeting ? (
              <div className="pt-2">
                <JoinMeetingButton appointmentId={appointment._id} />
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                🔒 You can join the meeting 30 minutes before the appointment.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
