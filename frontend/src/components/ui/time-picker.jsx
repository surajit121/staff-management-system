import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export function TimePicker({ value, onChange }) {
  const [hour12, setHour12] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState("AM");

  useEffect(() => {
    let timer;
    if (value) {
      const [h, m] = value.split(':');
      let hour = parseInt(h, 10);
      const isPm = hour >= 12;
      if (hour === 0) hour = 12;
      else if (hour > 12) hour -= 12;
      const formattedH = hour.toString().padStart(2, '0');
      timer = setTimeout(() => {
        setHour12(formattedH);
        setMinute(m);
        setAmpm(isPm ? 'PM' : 'AM');
      }, 0);
    } else {
      timer = setTimeout(() => {
        setHour12("");
        setMinute("");
        setAmpm("AM");
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [value]);

  const triggerChange = (h, m, a) => {
    if (!h || !m) return;
    let hour24 = parseInt(h, 10);
    if (a === 'PM' && hour24 !== 12) hour24 += 12;
    if (a === 'AM' && hour24 === 12) hour24 = 0;
    const formattedTime = `${hour24.toString().padStart(2, '0')}:${m}`;
    onChange(formattedTime);
  };

  return (
    <div className="flex gap-1.5 w-full items-center">
      <Select 
        value={hour12} 
        onValueChange={(v) => { 
          setHour12(v); 
          const newMinute = minute || "00";
          if (!minute) setMinute("00");
          triggerChange(v, newMinute, ampm); 
        }}
      >
        <SelectTrigger className="bg-surface2 flex-1 px-2 h-9 text-xs"><SelectValue placeholder="HH" /></SelectTrigger>
        <SelectContent className="bg-surface border-border max-h-[200px] min-w-[3rem]">
          {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="text-text2 font-bold mb-1">:</span>

      <Select 
        value={minute} 
        onValueChange={(v) => { 
          setMinute(v); 
          const newHour = hour12 || "12";
          if (!hour12) setHour12("12");
          triggerChange(newHour, v, ampm); 
        }}
      >
        <SelectTrigger className="bg-surface2 flex-1 px-2 h-9 text-xs"><SelectValue placeholder="MM" /></SelectTrigger>
        <SelectContent className="bg-surface border-border max-h-[200px] min-w-[3rem]">
          {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => (
            <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={ampm} 
        onValueChange={(v) => { 
          setAmpm(v); 
          if (hour12 && minute) triggerChange(hour12, minute, v); 
        }}
      >
        <SelectTrigger className="bg-surface2 w-[65px] px-2 h-9 text-xs"><SelectValue placeholder="AM/PM" /></SelectTrigger>
        <SelectContent className="bg-surface border-border min-w-[4rem]">
          <SelectItem value="AM" className="text-xs">AM</SelectItem>
          <SelectItem value="PM" className="text-xs">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
