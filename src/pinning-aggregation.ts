import { IpfsPinning } from "./ipfs-pinning";
import _ from "lodash";
import { PowergatePinning } from "./powergate-pinning";
import CID from "cids";
import { IPinning, IPinningStatic } from "./pinning.interface";
import { IContext } from "./context.interface";

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

  constructor(
    context: IContext,
    connectionStrings: string[],
    pinners: Array<IPinningStatic> = [IpfsPinning, PowergatePinning]
  ) {
    this.backends = connectionStrings.map((s) => {
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
}
