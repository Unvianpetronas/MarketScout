/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getSurveyEligibility = vi.fn();
const submitSystemSurvey = vi.fn();
const dismissSystemSurvey = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
const toggle = vi.fn();

vi.mock("@/services/survey.service", () => ({
  getSurveyEligibility: (...a: unknown[]) => getSurveyEligibility(...a),
  submitSystemSurvey: (...a: unknown[]) => submitSystemSurvey(...a),
  dismissSystemSurvey: (...a: unknown[]) => dismissSystemSurvey(...a),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

// Echo the key back so assertions don't depend on copy, except where the test
// is specifically about which language is rendered.
vi.mock("@/providers/language-provider", () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
    lang: "vi",
    toggle: () => toggle(),
  }),
}));

import { SusSurveyModal } from "./sus-survey-modal";

beforeEach(() => {
  vi.clearAllMocks();
  getSurveyEligibility.mockResolvedValue({ eligible: true, reportsNeeded: 0 });
  submitSystemSurvey.mockResolvedValue({ score: 100 });
  dismissSystemSurvey.mockResolvedValue(undefined);
});

afterEach(cleanup);

/** The 1–5 button for question `q` (1-indexed), matching its aria-label. */
const scaleButton = (q: number, value: number) =>
  screen.getByRole("button", { name: `${q}: ${value}` });

const answerAll = async (user: ReturnType<typeof userEvent.setup>, value = 3) => {
  for (let q = 1; q <= 10; q++) await user.click(scaleButton(q, value));
};

describe("SusSurveyModal", () => {
  it("stays hidden when the server says the user is not eligible", async () => {
    getSurveyEligibility.mockResolvedValue({ eligible: false, reportsNeeded: 2 });
    render(<SusSurveyModal />);

    await waitFor(() => expect(getSurveyEligibility).toHaveBeenCalled());
    expect(screen.queryByText("sus.title")).toBeNull();
  });

  it("stays hidden when the eligibility check fails, rather than nagging on an error", async () => {
    getSurveyEligibility.mockRejectedValue(new Error("network"));
    render(<SusSurveyModal />);

    await waitFor(() => expect(getSurveyEligibility).toHaveBeenCalled());
    expect(screen.queryByText("sus.title")).toBeNull();
  });

  it("renders all ten questions when eligible", async () => {
    render(<SusSurveyModal />);

    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());
    for (let q = 1; q <= 10; q++) {
      expect(screen.getByText(`sus.q${q}`)).toBeTruthy();
    }
  });

  it("cannot submit until every question is answered", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    const submit = screen.getByRole("button", { name: "sus.submit" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    // Nine of ten is still incomplete — a partial SUS has no valid score.
    for (let q = 1; q <= 9; q++) await user.click(scaleButton(q, 4));
    expect(submit.disabled).toBe(true);
    expect(submitSystemSurvey).not.toHaveBeenCalled();

    await user.click(scaleButton(10, 4));
    expect(submit.disabled).toBe(false);
  });

  it("tracks progress as questions are answered", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    expect(screen.getByText('sus.progress:{"done":0}')).toBeTruthy();
    await user.click(scaleButton(1, 5));
    await user.click(scaleButton(2, 5));
    expect(screen.getByText('sus.progress:{"done":2}')).toBeTruthy();
  });

  it("re-answering a question replaces the earlier choice instead of adding one", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    await user.click(scaleButton(1, 2));
    await user.click(scaleButton(1, 5));

    expect(screen.getByText('sus.progress:{"done":1}')).toBeTruthy();
    expect(scaleButton(1, 5).getAttribute("aria-pressed")).toBe("true");
    expect(scaleButton(1, 2).getAttribute("aria-pressed")).toBe("false");
  });

  it("submits the ten answers in question order", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    // A distinct value per question catches any ordering mistake — half the
    // items are reverse-scored, so a shuffled payload still scores plausibly.
    const values = [5, 1, 4, 2, 5, 1, 4, 2, 5, 1];
    for (let q = 1; q <= 10; q++) await user.click(scaleButton(q, values[q - 1]));
    await user.click(screen.getByRole("button", { name: "sus.submit" }));

    await waitFor(() => expect(submitSystemSurvey).toHaveBeenCalledWith(values, null));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("trims the optional comment and sends null when it is blank", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    await answerAll(user);
    await user.type(screen.getByPlaceholderText("sus.comment"), "   dùng ổn   ");
    await user.click(screen.getByRole("button", { name: "sus.submit" }));

    await waitFor(() =>
      expect(submitSystemSurvey).toHaveBeenCalledWith(expect.any(Array), "dùng ổn")
    );
  });

  it("keeps the survey open and warns when submitting fails", async () => {
    const user = userEvent.setup();
    submitSystemSurvey.mockRejectedValue(new Error("boom"));
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    await answerAll(user);
    await user.click(screen.getByRole("button", { name: "sus.submit" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("sus.error"));
    // Answers must survive a failed submit — retyping ten questions is the
    // fastest way to make someone abandon the survey.
    expect(screen.getByText("sus.title")).toBeTruthy();
    expect(screen.getByText('sus.progress:{"done":10}')).toBeTruthy();
  });

  // Skipping records a row server-side, which is what makes "asked once" true.
  it("records the skip on the server and closes", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "sus.skip" }));

    expect(dismissSystemSurvey).toHaveBeenCalled();
    expect(screen.queryByText("sus.title")).toBeNull();
    expect(submitSystemSurvey).not.toHaveBeenCalled();
  });

  it("offers a language toggle inside the survey", async () => {
    const user = userEvent.setup();
    render(<SusSurveyModal />);
    await waitFor(() => expect(screen.getByText("sus.title")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /VI/ }));
    expect(toggle).toHaveBeenCalled();
  });
});
