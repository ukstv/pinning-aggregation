declare module "ipfs-http-client" {
  import Ipfs from "ipfs";

  function ipfsClient(config?: any): Ipfs.Ipfs;

  export = ipfsClient;
}
