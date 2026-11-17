// @vitest-environment jsdom
// Anzeige (RichText) und Editor (RichTextEditor) im Browser-Umfeld.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { useState } from "react";

vi.mock("../../src/media/MediaLibraryModal", () => ({ default: () => null }));

import { RichText } from "../../src/richtext";
import { RichTextEditor } from "../../src/richtext/editor";

afterEach(cleanup);

describe("RichText", () => {
  it("rendert ohne innerHTML, externe Links mit rel und neuem Tab", () => {
    const html = renderToStaticMarkup(
      <RichText className="rich" value={'<p>Hallo <a href="https://example.com">extern</a> und <a href="/kontakt">intern</a></p><script>alert(1)</script>'} />,
    );
    expect(html).toBe('<div class="rich"><p>Hallo <a href="https://example.com" rel="noopener noreferrer" target="_blank">extern</a> und <a href="/kontakt">intern</a></p></div>');
  });

  it("zeigt Text im alten Format richtig an", () => {
    const html = renderToStaticMarkup(<RichText value={"## Titel\n\n**fett** und [Link](javascript:alert(1))"} />);
    expect(html).toBe("<div><h2>Titel</h2><p><strong>fett</strong> und [Link](javascript:alert(1))</p></div>");
  });

  it("rendert nichts bei leerem Wert", () => {
    expect(renderToStaticMarkup(<RichText value="<p></p>" />)).toBe("");
    expect(renderToStaticMarkup(<RichText value={null} />)).toBe("");
  });
});

describe("RichTextEditor", () => {
  it("lädt Text im alten Format umgewandelt und meldet ohne Änderung nichts", async () => {
    const onChange = vi.fn();
    const { container } = render(<RichTextEditor aria-label="Text" value={"**fett**\n\n- eins"} onChange={onChange} />);
    await waitFor(() => expect(container.querySelector(".ProseMirror strong")?.textContent).toBe("fett"));
    expect(container.querySelector(".ProseMirror ul li")?.textContent).toBe("eins");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("toolbar", { name: "Textformat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fett (Strg+B)" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Kursiv (Strg+I)" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("schreibt das HTML in ein verstecktes Feld und übernimmt neue Werte von außen", async () => {
    function Host() {
      const [v, setV] = useState("<p>eins</p>");
      return (
        <form>
          <RichTextEditor aria-label="Text" name="text" value={v} onChange={setV} />
          <button type="button" onClick={() => setV("<p>zwei</p>")}>
            wechseln
          </button>
        </form>
      );
    }
    const { container } = render(<Host />);
    const hidden = () => container.querySelector<HTMLInputElement>('input[type="hidden"][name="text"]')!;
    await waitFor(() => expect(container.querySelector(".ProseMirror")?.textContent).toBe("eins"));
    expect(hidden().value).toBe("<p>eins</p>");
    fireEvent.click(screen.getByText("wechseln"));
    await waitFor(() => expect(container.querySelector(".ProseMirror")?.textContent).toBe("zwei"));
    expect(hidden().value).toBe("<p>zwei</p>");
  });
});
