import _ from "lodash";
import CID from "cids";
import {
  CidList,
  IPinning,
  IPinningStatic,
  PinningInfo,
  IContext,
} from "@pinning-aggregation/common";
import * as base64 from "@stablelib/base64";
import * as sha256 from "@stablelib/sha256";

export class UnknownPinningService extends Error {
  constructor(designator: string | null) {
    super(`Unknown pinning service ${designator}`);
  }
}

const textEncoder = new TextEncoder();

/**
 * Multitude of pinning services united.
 */
export class PinningAggregation implements IPinning {
  readonly id: string;
  readonly backends: IPinning[];

  static build(
    context: IContext,
    connectionStrings: string[],
    pinners: Array<IPinningStatic> = []
  ) {
    const backends = connectionStrings.map<IPinning>((s) => {
      const protocol = new URL(s).protocol.replace(":", "");
      const match = protocol.match(/^(\w+)\+?/);
      const designator = match ? match[1] : null;
      const found = pinners.find((pinner) => pinner.designator === designator);
      if (found) {
        return new found(s, context);
      } else {
        throw new UnknownPinningService(designator);
      }
    });
    return new PinningAggregation(backends);
  }

  constructor(backends: IPinning[]) {
    this.backends = backends;

    const allIds = this.backends.map((b) => b.id).join("\n");
    const bytes = textEncoder.encode(allIds);
    const digest = base64.encodeURLSafe(sha256.hash(bytes));
    this.id = `pinning-aggregation@${digest}`;
  }

  /**
   * Open all the services.
   * Async semantics: every call should succeed.
   */
  async open(): Promise<void> {
    await Promise.all(this.backends.map(async (service) => service.open()));
  }

  /**
   * Close all the services.
   * Async semantics: every call should succeed.
   */
  async close(): Promise<void> {
    await Promise.all(this.backends.map(async (service) => service.close()));
  }

  /**
   * Pin document.
   * Async semantics: every call should succeed.
   */
  async pin(cid: CID): Promise<void> {
    await Promise.all(this.backends.map(async (service) => service.pin(cid)));
  }

  /**
   * Unpin CID.
   * Async semantics: individual call failures do not propagate upstream; anything goes.
   * @param cid
   */
  async unpin(cid: CID): Promise<void> {
    Promise.all(this.backends.map(async (service) => service.unpin(cid))).catch(
      _.noop
    );
  }

  /**
   * List pinned CIDs.
   */
  async ls(): Promise<CidList> {
    const perBackend = await Promise.all(this.backends.map((b) => b.ls()));
    const allCids = _.uniq(_.flatMap(perBackend, (p) => _.keys(p)));
    let result: CidList = {};
    allCids.forEach((cid) => {
      result[cid] = _.compact(_.flatMap(perBackend, (p) => p[cid]));
    });
    return result;
  }

  async info(): Promise<PinningInfo> {
    const perBackend = await Promise.all(this.backends.map((b) => b.info()));
    return _.merge({}, ...perBackend);
  }
}
