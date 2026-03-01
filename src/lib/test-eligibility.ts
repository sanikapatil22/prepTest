interface TestEligibilityFields {
  allowedDepartmentIds: unknown;
  allowedSemesters: unknown;
  allowedStudentIds: unknown;
}

interface StudentFields {
  id: string;
  departmentId: string | null;
  semester: number | null;
}

/**
 * Check if a student is eligible for a test based on eligibility criteria.
 *
 * Logic:
 * - If ALL three criteria are null/empty → all students are eligible (default)
 * - Specific students list = OR override (always eligible regardless of dept/semester)
 * - Department + Semester = AND (must match both if both are set)
 * - A student is eligible if: (matches dept AND matches semester) OR (is in specific student list)
 */
export function isStudentEligible(
  test: TestEligibilityFields,
  student: StudentFields
): boolean {
  const deptIds = Array.isArray(test.allowedDepartmentIds)
    ? (test.allowedDepartmentIds as string[])
    : [];
  const semesters = Array.isArray(test.allowedSemesters)
    ? (test.allowedSemesters as number[])
    : [];
  const studentIds = Array.isArray(test.allowedStudentIds)
    ? (test.allowedStudentIds as string[])
    : [];

  // No restrictions → all students eligible
  if (deptIds.length === 0 && semesters.length === 0 && studentIds.length === 0) {
    return true;
  }

  // Specific students override
  if (studentIds.includes(student.id)) {
    return true;
  }

  // Check department + semester (AND logic)
  const deptMatch =
    deptIds.length === 0 || (student.departmentId !== null && deptIds.includes(student.departmentId));
  const semesterMatch =
    semesters.length === 0 || (student.semester !== null && semesters.includes(student.semester));

  return deptMatch && semesterMatch;
}

/**
 * Build a Prisma `where` clause to query only eligible students for a test.
 */
export function buildEligibleStudentsWhere(
  test: TestEligibilityFields,
  collegeId: string
) {
  const deptIds = Array.isArray(test.allowedDepartmentIds)
    ? (test.allowedDepartmentIds as string[])
    : [];
  const semesters = Array.isArray(test.allowedSemesters)
    ? (test.allowedSemesters as number[])
    : [];
  const studentIds = Array.isArray(test.allowedStudentIds)
    ? (test.allowedStudentIds as string[])
    : [];

  const base = { collegeId, role: "STUDENT" as const };

  // No restrictions → all college students
  if (deptIds.length === 0 && semesters.length === 0 && studentIds.length === 0) {
    return base;
  }

  // Build department + semester AND condition
  const deptSemesterCondition: Record<string, unknown> = { ...base };
  if (deptIds.length > 0) {
    deptSemesterCondition.departmentId = { in: deptIds };
  }
  if (semesters.length > 0) {
    deptSemesterCondition.semester = { in: semesters };
  }

  // If there are specific students, use OR: (dept+semester match) OR (in student list)
  if (studentIds.length > 0) {
    return {
      ...base,
      OR: [
        // Remove base fields from deptSemesterCondition for OR clause since they're at top level
        ...(deptIds.length > 0 || semesters.length > 0
          ? [{
              ...(deptIds.length > 0 ? { departmentId: { in: deptIds } } : {}),
              ...(semesters.length > 0 ? { semester: { in: semesters } } : {}),
            }]
          : []),
        { id: { in: studentIds } },
      ],
    };
  }

  // Only dept/semester filters, no specific students
  return deptSemesterCondition;
}
