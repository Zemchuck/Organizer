import React from "react";
import MonthTable from "./MonthTable";

export default function MonthView({ date }) {
  return <MonthTable year={date.getFullYear()} month={date.getMonth()} />;
}
