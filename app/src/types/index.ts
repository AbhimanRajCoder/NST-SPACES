export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface RoomSchedule {
  room: string;
  day: string;
  occupied: TimeSlot[];
}

export interface FreeRoom {
  room: string;
  day: string;
  freeFrom: string;
  freeTill: string;
  duration: number; // in minutes
}

export interface PDFVersion {
  id: string;
  name: string;
  file_path: string;
  semester: number; // 1 or 2
  is_active: boolean;
  uploaded_at: string;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thur' | 'Fri' | 'Sat' | 'Sun';

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30'
] as const;

export const OPERATING_HOURS = {
  start: '09:00',
  end: '19:30'
} as const;
