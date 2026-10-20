import { DatabaseSync } from 'node:sqlite';

type WorkInsideTransaction = () => void;

export class DBTransaction
{
    private workToDo : WorkInsideTransaction
    private db : DatabaseSync;

    constructor( db : DatabaseSync, workOnDb : WorkInsideTransaction )
    {
        this.db = db;
        this.workToDo = workOnDb;
    }

    run() : void
    {
        this.db.exec('BEGIN');        
        try {
            this.workToDo();
            this.db.exec('COMMIT');
        } catch( error: unknown ) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
};
