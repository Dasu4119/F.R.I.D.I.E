import unittest
from datetime import UTC, datetime

from app.planner import build_plan


class PlannerTests(unittest.TestCase):
    def test_software_goal_routes_design_coding_and_verification(self):
        plan = build_plan(
            "Build an accessible UI and MongoDB API for F.R.I.D.I.E.",
            now=datetime(2026, 8, 30, tzinfo=UTC),
        )
        owners = {task.owner for task in plan.tasks}

        self.assertEqual(plan.trace_id, "fri-20260830-96587049")
        self.assertIn("design", owners)
        self.assertIn("coding", owners)
        self.assertEqual(plan.tasks[0].status, "ready")
        self.assertEqual(plan.tasks[-1].owner, "verification")
        self.assertTrue(plan.tasks[-1].depends_on)
        serialized = plan.model_dump(mode="json", by_alias=True)
        self.assertIn("traceId", serialized)
        self.assertIn("acceptanceCheck", serialized["tasks"][0])

    def test_short_goal_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "at least 8"):
            build_plan("tiny")


if __name__ == "__main__":
    unittest.main()
