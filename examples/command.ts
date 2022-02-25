import { PermissionManager } from "@bdsx/PermissionsX/lib/permissions";
import { command } from "bdsx/command";
import { events } from "bdsx/events";

events.serverOpen.on(() => {
  const manager = PermissionManager.create();
  
  command.register("command", "My Command").overload((param, origin, output) => {
    if (origin.getEntity()?.isPlayer()) {
      let player = origin.getEntity();
      
      if (manager.has(player, "my.custom.permission")) {
        output.success("Command with Permission!");
      }
    }
  }, {});
  
  manager.register("my.custom.permission", "command");
});