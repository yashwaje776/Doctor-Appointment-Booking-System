"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

import { bookAppointment, markPaymentPaid } from "@/actions/appointment";
import { createPayment, verifyPayment } from "@/actions/payment";

import BookingFormModal from "./BookingFormModal";

export default function TimeSelector({ docInfo, user }) {
  const router = useRouter();
  const availability = docInfo.availability;
  const todayStr = new Date().toISOString().split("T")[0];

  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

      arr.push({
        date: d.toISOString().split("T")[0],
        label: format(d, "MMM d"),
        display: format(d, "EEEE, MMM d"),
        weekday: format(d, "EEE"),
      });
    }
    return arr;
  }, []);

  const [activeDate, setActiveDate] = useState(days[0].date);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const slots = useMemo(() => {
    let s = [];
    const bookedForDay = docInfo.slots_booked?.[activeDate] || [];

    let [hour, minute] = availability.start.split(":").map(Number);
    const [endHour, endMinute] = availability.end.split(":").map(Number);
    const now = new Date();

    while (hour < endHour || (hour === endHour && minute <= endMinute)) {
      const t = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const slotDateTime = new Date(`${activeDate}T${t}`);

      const isPast = activeDate === todayStr && slotDateTime < now;
      const isBooked = bookedForDay.includes(t);

      if (!isPast && !isBooked) {
        s.push({
          startTime: `${activeDate}T${t}:00`,
          display: t,
          fee: docInfo.fees,
        });
      }

      minute += 30;
      if (minute >= 60) {
        hour++;
        minute = 0;
      }
    }

    return s;
  }, [activeDate, availability, docInfo.fees, docInfo.slots_booked]);

  const handleContinue = () => {
    if (!selectedSlot) return toast.error("Please select a time!");
    setModalOpen(true);
  };

  const confirmBooking = async (description) => {
    try {
      const booking = await bookAppointment({
        doctorId: docInfo._id,
        patientId: user._id,
        date: activeDate,
        time: selectedSlot.display,
        description,
        amount: docInfo.fees,
      });

      if (!booking.success) return toast.error(booking.message);

      const appointmentId = booking.appointment._id;

      toast.success("Appointment Created! Redirecting to payment...");

      const order = await createPayment(docInfo.fees, appointmentId);
      if (!order.success) return toast.error("Failed to create payment order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Doctor Appointment",
        order_id: order.id,

        handler: async function (response) {
          const verify = await verifyPayment({
            ...response,
            appointmentId,
          });

          if (!verify.success) return toast.error("Payment verification failed");

          await markPaymentPaid({
            appointmentId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
          });

          toast.success("Payment Successful!");
          router.push("/appointments");
        },

        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },

        theme: { color: "#22c55e" },
      };

      new window.Razorpay(options).open();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 mt-6 text-white space-y-6 shadow-xl shadow-black/20">
      <h2 className="text-xl font-semibold tracking-wide">Book Appointment</h2>

      <Tabs defaultValue={activeDate} onValueChange={setActiveDate}>
        <TabsList className="w-full justify-start overflow-x-auto p-2 rounded-lg bg-neutral-800">
          {days.map((day) => (
            <TabsTrigger
              key={day.date}
              value={day.date}
              className="flex gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 hover:bg-neutral-700 transition"
            >
              {day.label} <span className="opacity-70">{day.weekday}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {days.map((day) => (
          <TabsContent key={day.date} value={day.date} className="pt-4">
            <h3 className="text-lg font-medium mb-4 opacity-90">{day.display}</h3>

            {slots.length === 0 ? (
              <p className="text-neutral-500 py-8 text-center text-sm">
                No Slots Available
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot) => (
                  <Card
                    key={slot.startTime}
                    onClick={() => setSelectedSlot(slot)}
                    className={`cursor-pointer rounded-xl transition-all border 
                      ${
                        selectedSlot?.startTime === slot.startTime
                          ? "bg-emerald-700/30 border-emerald-500 shadow-md shadow-emerald-700/30"
                          : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700/50 hover:border-neutral-500"
                      }`}
                  >
                    <CardContent className="p-3 flex items-center justify-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      {format(new Date(slot.startTime), "h:mm a")}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg text-white font-semibold"
          disabled={!selectedSlot}
          onClick={handleContinue}
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <BookingFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        slot={selectedSlot}
        onConfirm={confirmBooking}
      />
    </div>
  );
}
