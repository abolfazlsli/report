export type Role = "admin" | "teacher" | "student";
export type EnrollmentStatus = "active" | "promoted" | "completed" | "withdrawn";

export interface UserBrief {
  id: number;
  username: string;
  full_name: string;
  avatar_version?: number | null;
}

export interface User extends UserBrief {
  national_code: string | null;
  role: Role;
  is_active: boolean;
  current_class_id: number | null;
  current_class: string | null;
  current_unit: string | null;
}

export interface Unit {
  id: number;
  name: string;
  description: string | null;
  class_count: number;
  student_count: number;
}

export interface Criterion {
  id: number;
  subject_id: number;
  title: string;
  description: string | null;
  order: number;
  used_count: number;
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
  unit: { id: number; name: string } | null;
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
  ratings: Rating[];
  rating_average: number | null;
  class_average: number | null;
}

export interface Rating {
  criterion_id: number;
  title: string;
  description: string | null;
  value: number | null;
  note: string | null;
}

export interface ReportEnrollment {
  enrollment_id: number;
  class_id: number;
  class_name: string;
  grade_name: string;
  grade_level: number;
  unit_name: string | null;
  year_name: string;
  status: EnrollmentStatus;
  started_at: string;
  ended_at: string | null;
  subjects: ReportSubject[];
  average: number | null;
  class_average: number | null;
  rank: number | null;
  class_size: number;
}

export interface Report {
  student: UserBrief;
  national_code: string | null;
  current_class: string | null;
  current_unit: string | null;
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
  unit_name: string | null;
  criteria_count: number;
  rated_count: number;
  average: number | null;
  score_count: number;
  year_name: string;
  is_current_year: boolean;
  subject_name: string;
  student_count: number;
}

export interface RatingSheet {
  class_subject_id: number;
  subject_name: string;
  criteria: Criterion[];
  students: {
    enrollment_id: number;
    student: UserBrief;
    status: EnrollmentStatus;
    ratings: Record<number, number>;
    notes: Record<number, string>;
  }[];
}

export interface Stats {
  units: { id: number; name: string; classes: number; students: number; average: number | null }[];
  distribution: Record<"good" | "ok" | "warning" | "critical", number>;
  subject_averages: { name: string; average: number | null; count: number }[];
  year_score_count: number;
  year_average: number | null;
  ratings: { filled: number; expected: number };
  criteria: number;
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
