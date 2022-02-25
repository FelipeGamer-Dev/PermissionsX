import * as fs from "fs";
import { join } from "path";
import { Player, PlayerPermission } from "bdsx/bds/player";
import { events } from "bdsx/event"
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { AvailableCommandsPacket as Acp } from "bdsx/bds/packets";
import { serverInstance } from "bdsx/bds/server";

export class PermissionManager {
  private _path: string = join(process.cwd(), "..", "permissions.json");
  private _initialized: boolean;
  
  static create(): PermissionManager {
    let manager = new PermissionManager();
    manager.init();
    
    return manager;
  }
  
  private _getRaw() {
    let permissions;
    
    try {
      if (!fs.existsSync(this._path)) {
        fs.writeFileSync(this._path, "{}");
      }
      permissions = JSON.parse(fs.readFileSync(this._path, "utf-8"));
    } catch (e) {
      if (e.name == "SyntaxError") {
        throw new Error("Permissions File is Corrupted!");
      }
    }
    
    return permissions;
  }
  
  public getVanillaPermissions() {
    return {
      "operator": "permissions.vanilla.operator"
    }
  }
  
  has(player: Player, permission: string): boolean {
    let xuid = player.getCertificate().getXuid();
    
    return this._getRaw()[permission].players.includes(xuid);
  }
  
  register(permission: (string | string[]), ...commands: string[]): void {
    let raw = this._getRaw();
    let commands_ = commands.map(cmd => cmd.toLowerCase());
    
    if (Array.isArray(permission)) {
      permission.forEach((perm: string) => {
        if (raw[perm]) {
          commands_.forEach((command: string) => {
            if (!raw[perm].commands.includes(command)) {
              raw[perm].commands.push(command);
            }
          });
        } else {
          raw[perm] = {
            commands: commands_,
            player: []
          };
        }
      });
    } else {
      if (raw[permission]) {
        commands_.forEach((command: string) => {
          if (!raw[permission].commands.includes(command)) {
            raw[permission].commands.push(command);
          }
        });
      } else {
        raw[permission] = {
          commands: commands_,
          players: []
        };
      }
      
    }
    this._updateFile(raw);
    serverInstance.updateCommandList();
  }
  
  private _updateFile(obj): void {
    fs.writeFileSync(this._path, JSON.stringify(obj, null, 3));
  }
  
  private _update(player: Player): void {
    let pk = serverInstance.minecraft.getCommands().getRegistry().serializeAvailableCommands();
    
    player.sendNetworkPacket(pk);
    pk.dispose();
  }
  
  getPermissions(player: Player): string[] {
    let raw = this._getRaw();
    let xuid = player.getCertificate().getXuid();
    
    return Object.keys(raw).filter((permission: string) => raw[permission].players.includes(xuid));
  }
  
  add(player: Player, permission: string): boolean {
    let xuid = player.getCertificate().getXuid();
    let raw = this._getRaw();
    
    if (!raw[permission].players.includes(xuid)) {
      raw[permission].players.push(xuid);
      this._updateFile(raw);
      this._update(player);
      return true;
    }
    return false;
  }
  
  remove(player: Player, permission: string): boolean {
    let xuid = player.getCertificate().getXuid();
    let raw = this._getRaw();
    
    if (raw[permission].players.includes(xuid)) {
      raw[permission].players.splice(raw[permission].players.indexOf(xuid), 1);
      this._updateFile(raw);
      this._update(player);
      return true;
    }
    return false;
  }
  
  getCommandPermissions(command: Acp.CommandData): string[] {
    let raw = this._getRaw();
    let permissions: string[] = Object.keys(raw).filter((perm: string) => raw[perm].commands.includes(command.name.toLowerCase()));
    
    return permissions;
  }
  
  exists(permission: string): boolean {
    return Object.keys(this._getRaw).includes(permission);
  }
  
  init(): void {
    if (this._initialized) return;
    this._getRaw();
    
    events.packetSend(MinecraftPacketIds.AvailableCommands).on((pk, ni) => {
      let p = ni.getActor();
      
      pk.commands.toArray().forEach((command: Acp.CommandData, index: number) => {
        let permissions = this.getCommandPermissions(command);
        
        if (permissions.length >= 1) {
          let pPerms = [];
          
          permissions.forEach((perm) => {
            if (this.has(p, perm)) {
              pPerms.push(perm);
            }
          });
          
          if (pPerms.length !== permissions.length) {
            pk.commands.splice(index, 1);
          }
        }
      });
    });
    
    events.levelTick.on(() => {
      serverInstance.getPlayers().forEach((p: Player) => {
        if (p.getPermissionLevel() == PlayerPermission.OPERATOR) {
          this.add(p, this.getVanillaPermissions().operator);
        }
      });
    });
    
    this._initialized = true;
  }
}