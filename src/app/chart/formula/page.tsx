import type { Metadata } from "next";
import { FormulaWorkbench } from "@/components/dashboard/FormulaWorkbench";

/**
 * The formula workbench.
 *
 * `/chart` answers the two reader questions and draws one projection. This page
 * opens the projection itself: the parameters, the arithmetic, the order the
 * steps run in, and what all of it does to 21 years of the model.
 *
 * Everything here is client-side arithmetic on already-loaded data — no report
 * is parsed and no locale is needed — so the route is static and renders
 * immediately.
 */
export const metadata: Metadata = {
  title: "The formula workbench — Airport for All",
  description:
    "Edit every parameter and every expression behind the airport concession projection, and watch the model change year by year.",
};

export default function FormulaPage() {
  return <FormulaWorkbench />;
}
