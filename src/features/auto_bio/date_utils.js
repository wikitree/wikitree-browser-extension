// date_utils.js
import dayjs from "dayjs";
import customParse from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParse);

export function p(regex, group = 1, post = (s) => s) {
  return { regex, group, post };
}

export function norm(s) {
  const str = s.trim();
  const tidy = str.replace(/\b([a-z])([a-z]+)\b/g, (m, a, b) => a.toUpperCase() + b); // april → April
  const d = dayjs(tidy, ["D MMMM YYYY", "D MMM YYYY", "DD MMM YYYY", "YYYY-MM-DD", "D-M-YYYY", "DD-MM-YYYY"], true);
  return d.isValid() ? d.format("D MMM YYYY") : str;
}
