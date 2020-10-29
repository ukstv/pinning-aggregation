import type {
  CidList,
  IPinning,
  PinningInfo,
  IContext,
} from "@pinning-aggregation/common";
import type { Ipfs } from "ipfs";
import type CID from "cids";
import * as sha256 from "@stablelib/sha256";
import * as base64 from "@stablelib/base64";

const FROM_CONTEXT_HOST = "__context";

export class NoIpfsInstanceError extends Error {
  constructor() {
    super("No IPFS instance available");
  }
}

const textEncoder = new TextEncoder();

/**
 * Pin document to a IPFS node.
 *
 * +connectionString+ indicates what node to connect to. It has a form of URL starting with `ipfs` protocol,
 * for example: `ipfs://3.3.3.3:5001`. It would translate into `http://3.3.3.3:5001` IPFS endpoint connection.
 *
 * Ceramic node already manages a connection to IPFS. If it is preferred to reuse the connection, one should
 * pass a special `__context` hostname into the connection string: `ipfs:///__context:5001`.
 */
export class IpfsPinning implements IPinning {
  static designator = "ipfs";

  readonly ipfsAddress: string;
  readonly id: string;

  readonly #context: IContext;
  #ipfs: Ipfs | undefined;

  constructor(readonly connectionString: string, context: IContext) {
    const url = new URL(connectionString);
    const ipfsHost = url.hostname;
    const ipfsPort = parseInt(url.port, 10) || 5001;
    if (ipfsHost === FROM_CONTEXT_HOST) {
      this.ipfsAddress = FROM_CONTEXT_HOST;
    } else {
      const protocol = url.protocol
        .replace("ipfs:", "http")
        .replace("ipfs+http:", "http")
        .replace("ipfs+https:", "https");
      this.ipfsAddress = `${protocol}://${ipfsHost}:${ipfsPort}`;
    }
    this.#context = context;

    const bytes = textEncoder.encode(this.connectionString);
    const digest = base64.encodeURLSafe(sha256.hash(bytes));
    this.id = `${IpfsPinning.designator}@${digest}`;
  }

  get ipfs() {
    return this.#ipfs;
  }

  async open(): Promise<void> {
    if (this.ipfsAddress === FROM_CONTEXT_HOST) {
      if (this.#context.ipfs) {
        this.#ipfs = this.#context.ipfs;
      } else {
        throw new NoIpfsInstanceError();
      }
    } else {
      const ipfsClientImport = await import("ipfs-http-client");
      const ipfsClient = ipfsClientImport.default;
      this.#ipfs = ipfsClient(this.ipfsAddress);
    }
  }

  async close(): Promise<void> {
    // Do Nothing
  }

  async pin(cid: CID): Promise<void> {
    await this.#ipfs?.pin.add(cid, { recursive: false });
  }

  async unpin(cid: CID): Promise<void> {
    await this.#ipfs?.pin.rm(cid);
  }

  async ls(): Promise<CidList> {
    const iterable = this.#ipfs?.pin.ls();
    if (iterable) {
      let result: CidList = {};
      for await (let r of iterable) {
        result[r.cid.toString()] = [this.id];
      }
      return result;
    } else {
      return {};
    }
  }

  async info(): Promise<PinningInfo> {
    return { [this.id]: {} };
  }
}
