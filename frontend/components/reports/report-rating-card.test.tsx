/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getReportRating = vi.fn();
const upsertReportRating = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/services/report.service", () => ({
  getReportRating: (...args: unknown[]) => getReportRating(...args),
  upsertReportRating: (...args: unknown[]) => upsertReportRating(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

import { ReportRatingCard } from "./report-rating-card";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing rating for this report.
  getReportRating.mockResolvedValue(null);
  upsertReportRating.mockResolvedValue(undefined);
});

afterEach(cleanup);

const stars = () => screen.getAllByRole("button", { name: /sao$/ });

describe("ReportRatingCard", () => {
  it("starts unrated and submits nothing until a star is picked", async () => {
    const user = userEvent.setup();
    render(<ReportRatingCard reportId="r-1" />);

    await waitFor(() => expect(getReportRating).toHaveBeenCalledWith("r-1"));
    expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    // The guard that matters: no request, and the user is told why.
    expect(upsertReportRating).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Hãy chọn số sao trước khi gửi.");
  });

  it("sends the chosen star count and trims the comment", async () => {
    const user = userEvent.setup();
    render(<ReportRatingCard reportId="r-1" />);
    await waitFor(() => expect(getReportRating).toHaveBeenCalled());

    await user.click(stars()[3]); // 4 sao
    expect(screen.getByText("4/5")).toBeTruthy();

    await user.type(screen.getByPlaceholderText(/Nhận xét thêm/), "  rất hữu ích  ");
    await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() =>
      expect(upsertReportRating).toHaveBeenCalledWith("r-1", 4, "rất hữu ích")
    );
    expect(toastSuccess).toHaveBeenCalledWith("Cảm ơn đánh giá của bạn!");
  });

  // Nullable comment is meaningful in the API — "" would persist an empty
  // string instead of recording that the user left no note.
  it("sends null rather than an empty string when no comment is written", async () => {
    const user = userEvent.setup();
    render(<ReportRatingCard reportId="r-2" />);
    await waitFor(() => expect(getReportRating).toHaveBeenCalled());

    await user.click(stars()[0]); // 1 sao
    await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(upsertReportRating).toHaveBeenCalledWith("r-2", 1, null));
  });

  it("hydrates an existing rating and switches the button to update mode", async () => {
    getReportRating.mockResolvedValue({ stars: 5, comment: "tuyệt vời" });
    render(<ReportRatingCard reportId="r-3" />);

    await waitFor(() => expect(screen.getByText("Đã đánh giá ✓")).toBeTruthy());
    expect(screen.getByText("5/5")).toBeTruthy();
    expect((screen.getByPlaceholderText(/Nhận xét thêm/) as HTMLTextAreaElement).value).toBe(
      "tuyệt vời"
    );
    expect(screen.getByRole("button", { name: "Cập nhật đánh giá" })).toBeTruthy();
  });

  it("keeps the card usable and reports the failure when saving fails", async () => {
    const user = userEvent.setup();
    upsertReportRating.mockRejectedValue(new Error("500"));
    render(<ReportRatingCard reportId="r-4" />);
    await waitFor(() => expect(getReportRating).toHaveBeenCalled());

    await user.click(stars()[2]); // 3 sao
    await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Không gửi được đánh giá. Thử lại sau.")
    );
    // Not stuck on "Đang gửi…", and not falsely marked as saved.
    expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeTruthy();
    expect(screen.queryByText("Đã đánh giá ✓")).toBeNull();
  });

  // A failing GET must not blank the card — the user can still rate.
  it("still renders when the initial fetch rejects", async () => {
    getReportRating.mockRejectedValue(new Error("network"));
    render(<ReportRatingCard reportId="r-5" />);

    await waitFor(() => expect(getReportRating).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeTruthy();
    expect(stars()).toHaveLength(5);
  });
});
