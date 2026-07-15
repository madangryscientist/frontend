import type { HassEntity } from "home-assistant-js-websocket/dist/types";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction, hasAnyAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import type { GateWidgetCardConfig } from "./types";

const DEFAULT_HEIGHT = 360;

const DEFAULT_COLORS = {
  closed: "#f38ba8",
  opening: "#cba6f7",
  closing: "#cba6f7",
  paused: "#f9e2af",
  open: "#a6e3a1",
} as const;

type GateStateKey = keyof typeof DEFAULT_COLORS;

const STATE_LABELS: Record<GateStateKey, string> = {
  closed: "CLOSED",
  opening: "OPENING",
  closing: "CLOSING",
  paused: "PAUSED",
  open: "OPEN",
};

@customElement("hui-gate-widget-card")
export class HuiGateWidgetCard extends LitElement implements LovelaceCard {
  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GateWidgetCardConfig {
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state));

    const foundEntities = findEntities(
      hass,
      1,
      entities,
      entitiesFallback,
      ["sensor", "input_number", "number"],
      entityFilter
    );

    return {
      type: "gate-widget-card",
      entity: foundEntities[0] || "",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GateWidgetCardConfig;

  public getCardSize(): number {
    return 6;
  }

  public setConfig(config: GateWidgetCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }
    if (config.state_entity && !isValidEntityId(config.state_entity)) {
      throw new Error("Invalid state entity");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (hasConfigOrEntityChanged(this, changedProps)) {
      return true;
    }
    const stateEntity = this._config?.state_entity;
    if (!stateEntity) {
      return false;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return false;
    }
    return oldHass.states[stateEntity] !== this.hass?.states[stateEntity];
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    if (stateObj.state === UNAVAILABLE || stateObj.state === UNKNOWN) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_unavailable",
            { entity: this._config.entity }
          )}</hui-warning
        >
      `;
    }

    const numericState = Number(stateObj.state);
    if (isNaN(numericState)) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_non_numeric",
            { entity: this._config.entity }
          )}</hui-warning
        >
      `;
    }

    const pct = Math.max(0, Math.min(100, Math.round(numericState)));
    const stateKey = this._resolveStateKey(pct);
    const color = this._resolveColor(stateKey);
    const label = STATE_LABELS[stateKey];
    const height = this._config.height ?? DEFAULT_HEIGHT;

    return html`
      <ha-card
        class=${classMap({
          action: hasAnyAction(this._config),
        })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleClick: hasAction(this._config.double_tap_action),
        })}
        tabindex=${ifDefined(hasAnyAction(this._config) ? "0" : undefined)}
        style=${styleMap({ height: `${height}px` })}
      >
        <div class="widget">
          <div
            class="fill"
            style=${styleMap({
              height: `${pct}%`,
              background: `linear-gradient(to top, ${color}, ${color}bb)`,
              boxShadow: `0 0 40px ${color}55`,
            })}
          ></div>
          <div class="overlay">
            <div class="percentage">${pct}%</div>
            <div class="label">${label}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _resolveStateKey(pct: number): GateStateKey {
    const stateEntityId = this._config?.state_entity;
    const stateEntity = stateEntityId
      ? this.hass?.states[stateEntityId]
      : undefined;
    const rawState = stateEntity?.state?.toLowerCase();

    if (rawState === "opening" || rawState === "closing") {
      return rawState;
    }
    if (rawState === "paused") {
      return "paused";
    }
    if (rawState === "open" || rawState === "closed") {
      return rawState;
    }
    return pct >= 95 ? "open" : "closed";
  }

  private _resolveColor(stateKey: GateStateKey): string {
    const overrides = this._config?.colors;
    return overrides?.[stateKey] ?? DEFAULT_COLORS[stateKey];
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static styles = css`
    ha-card {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
      width: 100%;
    }

    ha-card.action {
      cursor: pointer;
    }

    ha-card:focus {
      outline: none;
    }

    .widget {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .fill {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      transition:
        height 1.2s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.6s ease,
        box-shadow 0.6s ease;
    }

    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
      pointer-events: none;
    }

    .percentage {
      font-size: 5em;
      font-weight: 700;
      line-height: 1;
    }

    .label {
      margin-top: 0.5em;
      font-size: 1em;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.85;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gate-widget-card": HuiGateWidgetCard;
  }
}
