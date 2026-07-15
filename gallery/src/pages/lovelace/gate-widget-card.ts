import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  {
    entity_id: "sensor.garage_gate_position_closed",
    state: "0",
    attributes: {},
  },
  {
    entity_id: "sensor.garage_gate_position_partial",
    state: "42",
    attributes: {},
  },
  {
    entity_id: "sensor.garage_gate_position_open",
    state: "100",
    attributes: {},
  },
  {
    entity_id: "input_select.garage_gate_state_opening",
    state: "opening",
    attributes: {},
  },
  {
    entity_id: "input_select.garage_gate_state_paused",
    state: "paused",
    attributes: {},
  },
];

const CONFIGS = [
  {
    heading: "Closed",
    config: `
- type: gate-widget-card
  entity: sensor.garage_gate_position_closed
    `,
  },
  {
    heading: "Partially open with state entity (opening)",
    config: `
- type: gate-widget-card
  entity: sensor.garage_gate_position_partial
  state_entity: input_select.garage_gate_state_opening
    `,
  },
  {
    heading: "Partially open, paused",
    config: `
- type: gate-widget-card
  entity: sensor.garage_gate_position_partial
  state_entity: input_select.garage_gate_state_paused
    `,
  },
  {
    heading: "Fully open",
    config: `
- type: gate-widget-card
  entity: sensor.garage_gate_position_open
    `,
  },
  {
    heading: "Custom colours and height",
    config: `
- type: gate-widget-card
  entity: sensor.garage_gate_position_partial
  height: 260
  colors:
    closed: "#ff6b6b"
    open: "#4ade80"
    `,
  },
];

@customElement("demo-lovelace-gate-widget-card")
class DemoGateWidgetCard extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    mockIcons(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-gate-widget-card": DemoGateWidgetCard;
  }
}
