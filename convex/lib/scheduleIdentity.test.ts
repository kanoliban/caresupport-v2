import { describe, expect, it } from "vitest";
import {
  normalizeScheduleTitle,
  scheduleTitlesMatch,
  selectLatestScheduleItems,
} from "./scheduleIdentity";

describe("schedule identity", () => {
  it("keeps a time change attached to the same stable title", () => {
    expect(normalizeScheduleTitle("Ebise insulin at 2:15pm")).toBe(
      "ebise insulin",
    );
    expect(
      scheduleTitlesMatch("Ebise insulin at 2:15pm", "Ebise insulin at 4pm daily reminder"),
    ).toBe(true);
  });

  it("selects the newest row when legacy duplicates already exist", () => {
    const selected = selectLatestScheduleItems([
      { title: "Ebise insulin", _creationTime: 1 },
      { title: "Ebise insulin at 4pm", _creationTime: 2 },
    ]);

    expect(selected).toEqual([
      { title: "Ebise insulin at 4pm", _creationTime: 2 },
    ]);
  });
});
