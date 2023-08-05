import { expect, test } from "vitest";

import { hashMySQLNativePassword } from "@/Protocol/Plugins/MySqlNativePassword";

test("call hashMySQLNativePassword()", () => {
  const authenticationSeed = Buffer.from([
    // Scramble #1.
    0x28, 0x53, 0x49, 0x54, 0x4b, 0x5c, 0x69, 0x7d,
    // Scramble #2.
    0x5a, 0x28, 0x57, 0x5e, 0x54, 0x69, 0x34, 0x65, 0x23, 0x79, 0x5c, 0x40,
  ]);

  expect(hashMySQLNativePassword(authenticationSeed, "password")).toStrictEqual(
    Buffer.from([
      0x1e, 0x59, 0x38, 0x88, 0x3b, 0xee, 0xe1, 0xb2, 0x4c, 0x7e, 0x44, 0x48,
      0x68, 0xfd, 0xd3, 0x24, 0xf9, 0xf1, 0x92, 0x28,
    ]),
  );
});
