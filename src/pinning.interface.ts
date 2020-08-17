import CID from "cids";
import { IContext } from "./context.interface";

export interface IPinning {
  open(): Promise<void>;
  close(): Promise<void>;
  pin(cid: CID): Promise<void>;
  unpin(cid: CID): Promise<void>;
}

export interface IPinningStatic {
  designator: string;
  build (connectionString: string, context: IContext): Promise<IPinning>;
}
