import { Model, DataTypes, Sequelize } from 'sequelize';

export default class Maintainers extends Model {
  public id: number;
  public account: string;
  public pid: number;
  public ctime: Date;

  public static installer(sequelize: Sequelize) {
    Maintainers.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      account: DataTypes.STRING(100),
      pid: DataTypes.INTEGER({ length: 11 }),
      ctime: DataTypes.DATE
    }, {
      tableName: 'maintainer',
      sequelize,
      createdAt: 'ctime',
      updatedAt: 'utime',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }
}