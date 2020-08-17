import ipfsClient from "ipfs-http-client";
import CID from "cids";
import { IpfsPinning, NoIpfsInstanceError } from "./ipfs-pinning";
import { IContext } from "./context.interface";

jest.mock("ipfs-http-client");

beforeEach(() => {
  (ipfsClient as any).mockClear();
});

describe("constructor", () => {
  test("set IPFS address to __context", () => {
    const pinning = new IpfsPinning("ipfs://__context", {});
    expect(pinning.ipfsAddress).toEqual("__context");
  });
  test("set IPFS address from ipfs protocol", () => {
    const pinning = new IpfsPinning("ipfs://example.com", {});
    expect(pinning.ipfsAddress).toEqual("http://example.com:5001");
  });
  test("set IPFS address from ipfs protocol with port", () => {
    const pinning = new IpfsPinning("ipfs://example.com:3432", {});
    expect(pinning.ipfsAddress).toEqual("http://example.com:3432");
  });
  test("set IPFS address from ipfs+http protocol", () => {
    const pinning = new IpfsPinning("ipfs+http://example.com", {});
    expect(pinning.ipfsAddress).toEqual("http://example.com:5001");
  });
  test("set IPFS address from ipfs+https protocol", () => {
    const pinning = new IpfsPinning("ipfs+https://example.com", {});
    expect(pinning.ipfsAddress).toEqual("https://example.com:5001");
  });
});

describe("#open", () => {
  test("use IPFS from context if __context", async () => {
    const context = ({ ipfs: jest.fn() } as unknown) as IContext;
    const pinning = new IpfsPinning("ipfs://__context", context);
    await pinning.open();
    expect(pinning.ipfs).toBe(context.ipfs);
  });
  test("throw if no IPFS instance in context", async () => {
    const context = {};
    const pinning = new IpfsPinning("ipfs://__context", context);
    await expect(pinning.open.bind(pinning)).rejects.toThrow(
      NoIpfsInstanceError
    );
  });
  test("use IPFS client pointed to #ipfsAddress", async () => {
    const pinning = new IpfsPinning("ipfs+https://example.com", {});
    await pinning.open();
    expect(ipfsClient).toBeCalledWith("https://example.com:5001");
  });
});

describe("#pin", () => {
  test("call ipfs instance", async () => {
    const add = jest.fn();
    const context = ({
      ipfs: {
        pin: {
          add: add,
        },
      },
    } as unknown) as IContext;
    const pinning = new IpfsPinning("ipfs://__context", context);
    await pinning.open();
    const cid = new CID("QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D");
    await pinning.pin(cid);
    expect(add).toBeCalledWith(cid, { recursive: false });
  });

  test("silently pass if no IPFS instance", async () => {
    const context = {} as IContext;
    const pinning = new IpfsPinning("ipfs://__context", context);
    const cid = new CID("QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D");
    await expect(pinning.pin(cid)).resolves.toBeUndefined();
  });
});

describe("#unpin", () => {
  test("call ipfs instance", async () => {
    const rm = jest.fn();
    const context = ({
      ipfs: {
        pin: {
          rm: rm,
        },
      },
    } as unknown) as IContext;
    const pinning = new IpfsPinning("ipfs://__context", context);
    await pinning.open();
    const cid = new CID("QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D");
    await pinning.unpin(cid);
    expect(rm).toBeCalledWith(cid);
  });

  test("silently pass if no IPFS instance", async () => {
    const context = {} as IContext;
    const pinning = new IpfsPinning("ipfs://__context", context);
    const cid = new CID("QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D");
    await expect(pinning.unpin(cid)).resolves.toBeUndefined();
  });
});
