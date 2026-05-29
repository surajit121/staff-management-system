import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export function Combobox({ options = [], value, onChange, placeholder = "Select option...", className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption && !isOpen) {
      setSearchTerm(selectedOption.label);
    } else if (!value && !isOpen) {
      setSearchTerm("");
    }
  }, [value, options, isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (selectedValue, selectedLabel) => {
    onChange(selectedValue);
    setSearchTerm(selectedLabel);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    // Emit the raw input value to allow custom (unlisted) entries
    onChange(e.target.value);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative w-full">
        <Input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn("pr-8 h-9 text-xs focus-visible:ring-accent", className)}
        />
        <div 
          className="absolute right-0 top-0 h-full flex items-center pr-2 cursor-pointer text-muted-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "px-3 py-2 text-[11px] cursor-pointer hover:bg-surface2 transition-colors flex items-center justify-between",
                  value === opt.value ? "bg-surface2/50 font-medium text-accent" : "text-text"
                )}
                onClick={() => handleSelect(opt.value, opt.label)}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-accent ml-2 shrink-0" />}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] text-text3">
              No preset found. Using typed value.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
