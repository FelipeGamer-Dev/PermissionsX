import { events } from "bdsx/event";
import { command } from "bdsx/command";
import * as fs from "fs";
import { join } from "path";
import { PermissionManager } from "./lib/permissions";
import { CommandPermissionLevel, PlayerWildcardCommandSelector } from "bdsx/bds/command";
import { CxxString } from "bdsx/nativetype";

function out(p, msg) {
  let raw = msg;
  let cmd = msg.split(/§[A-z]/).filter(s => s !== "").join("");
  
  p ? p.sendMessage(raw) : console.log(cmd);
}

events.serverOpen.on(() => {
  let manager = PermissionManager.create();
  
  command.register("addpermission", "Adds a Permision for a player").overload((p, o, op) => {
    let player = o.getEntity();
    
    if ((player && manager.has(player, "permissionsx.command.addpermission")) || o.isServerCommandOrigin()) {
      let targets = p.target.newResults(o);
      let perm = p.permission;
      
      if (!manager.exists(perm)) {
        out(player, `§cPermission "${perm}" doesn't exists§r`)
      } else if (targets.length == 1) {
        manager.add(targets[0], perm);
        out(player, `§aAdded Permission "${perm}" to "${targets[0].getName()} successfully!§r`);
      } else if (targets.length > 1) {
        let players = "";
        
        targets.forEach(p_ => {
          manager.add(p_, perm);
          players += p_.getName();
        });
        
        out(player, `§aAdded Permission "${perm}" to ${players} successfully!§r`);
      }
    }
  }, {
    target: PlayerWildcardCommandSelector,
    permission: CxxString
  });

  command.register("removepermission", "Adds a Permision for a player").overload((p, o, op) => {
    let player = o.getEntity();
    
    if ((player && manager.has(player, "permissionsx.command.removepermission")) || o.isServerCommandOrigin()) {
      let targets = p.target.newResults(o);
      let perm = p.permission;
      
      if (!manager.exists(perm)) {
        out(player, `§cPermission "${perm}" doesn't exists§r`)
      } else if (targets.length == 1) {
        manager.remove(targets[0], perm);
        out(player, `§removed Permission "${perm}" to "${targets[0].getName()} successfully!§r`);
      } else if (targets.length > 1) {
        let players = "";
        
        targets.forEach(p_ => {
          manager.remove(p_, perm);
          players += p_.getName();
        });
        
        out(player, `§aRemoved Permission "${perm}" to ${players} successfully!§r`);
      }
    }
  }, {
    target: PlayerWildcardCommandSelector,
    permission: CxxString
  });
  
  manager.register("permissionsx.command.addpermission", "addpermission");
  manager.register("permissionsx.command.removepermission", "removepermission");
});