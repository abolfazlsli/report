export type Role = "admin" | "teacher" | "student";
export type EnrollmentStatus = "active" | "promoted" | "completed" | "withdrawn";

export interface UserBrief {
  id: number;
  username: string;
  full_name: string;
}

export interface User extends UserBrief {
  national_code: string | null;
  role: Role;
  is_active: boolean;
  current_class_id: number | null;
  current_class: string | null;
}

export interface Year {
  id: number;
  name: string;
  is_current: boolean;
}

export interface Grade {
  id: number;
  name: string;
  level: number;
}

export interface Subject {
  id: number;
  name: string;
}

export interface ClassRoom {
  id: number;
  name: string;
  grade: Grade;
  academic_year: Year;
  student_count: number;
}

export interface ClassSubject {
  id: number;
  subject: Subject;
  teacher: UserBrief | null;
  score_count: number;
}

export interface Enrollment {
  id: number;
  status: EnrollmentStatus;
  started_at: string;
  ended_at: string | null;
  student: UserBrief;
}

export interface ClassDetail extends ClassRoom {
  subjects: ClassSubject[];
  enrollments: Enrollment[];
}

export interface Score {
  id: number;
  value: number;
  date: string;
  title: string | null;
  note: string | null;
  teacher_name: string | null;
}

export interface ReportSubject {
  class_subject_id: number;
  subject_id: number;
  subject_name: string;
  teacher_name: string | null;
  scores: Score[];
  average: number | null;
}

export interface ReportEnrollment {
  enrollment_id: number;
  class_id: number;
  class_name: string;
  grade_name: string;
  grade_level: number;
  year_name: string;
  status: EnrollmentStatus;
  started_at: string;
  ended_at: string | null;
  subjects: ReportSubject[];
  average: number | null;
}

export interface Report {
  student: UserBrief;
  current_class: string | null;
  enrollments: ReportEnrollment[];
}

export interface SheetStudent {
  enrollment_id: number;
  student: UserBrief;
  status: EnrollmentStatus;
  scores: Score[];
  average: number | null;
}

export interface Sheet {
  class_subject_id: number;
  class_id: number;
  class_name: string;
  grade_name: string;
  year_name: string;
  subject_name: string;
  teacher_name: string | null;
  students: SheetStudent[];
}

export interface Assignment {
  class_subject_id: number;
  class_id: number;
  class_name: string;
  grade_name: string;
  year_name: string;
  is_current_year: boolean;
  subject_name: string;
  student_count: number;
}

export interface Stats {
  students: number;
  teachers: number;
  classes: number;
  scores: number;
  current_year: string | null;
  unassigned_subjects: number;
  recent_scores: {
    id: number;
    value: number;
    date: string;
    title: string | null;
    student_id: number;
    student_name: string;
    subject_name: string;
    class_name: string;
    teacher_name: string | null;
  }[];
}
