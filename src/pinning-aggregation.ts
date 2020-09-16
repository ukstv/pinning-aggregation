import { IpfsPinning } from "./ipfs-pinning";
import _ from "lodash";
import { PowergatePinning } from "./powergate-pinning";
import CID from "cids";
import { IPinning, IPinningStatic } from "./pinning.interface";
import { IContext } from "./context.interface";
import {CidList} from "./cid-list";

export class UnknownPinningService extends Error {
  constructor(designator: string | null) {
    super(`Unknown pinning service ${designator}`);
  }
}

/**
 * Multitude of pinning services united.
 */
export class PinningAggregation implements IPinning {
  readonly backends: IPinning[];

  static async build(
    context: IContext,
    connectionStrings: string[],
    pinners: Array<IPinningStatic> = [IpfsPinning, PowergatePinning]
  ) {
    const backendsP = connectionStrings.map((s) => {
      const protocol = new URL(s).protocol.replace(":", "");
      const match = protocol.match(/^(\w+)\+?/);
      const designator = match ? match[1] : null;
      const found = pinners.find((pinner) => pinner.designator === designator);
      if (found) {
        return found.build(s, context);
      } else {
        throw new UnknownPinningService(designator);
      }
    });
    const backends = await Promise.all(backendsP);
    return new PinningAggregation(backends);
  }

  constructor(backends: IPinning[]) {
    this.backends = backends;
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
   * Unpin the document.
   * Async semantics: individual call failures do not propagate upstream; anything goes.
   * @param docId
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
    const perBackend = await Promise.all(this.backends.map(b => b.ls()))
    const allCids = _.uniq(_.flatMap(perBackend, p => _.keys(p)))
    let result: CidList = {}
    allCids.forEach(cid => {
      result[cid] = _.compact(_.flatMap(perBackend, p => p[cid]))
    })
    return result
  }
}
