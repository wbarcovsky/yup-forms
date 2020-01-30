import * as yup from 'yup';
import * as _ from 'lodash';

type Errors<T> = {
    [field in keyof T]?: string | Errors<T[field]>
};

export interface FormError {
    path: string;
    message: string;
    validator: string;
}

export type FORM_STATE = 'VALID' | 'INVALID' | 'UNKNOWN';

export class YupForm<T> {

    protected formState: FORM_STATE = 'UNKNOWN';
    protected formErrors: FormError[] = [];
    protected valueSnapshot: T = null;

    public get isValid(): boolean {
        return this.formState === 'VALID';
    }

    constructor(
        protected schema: yup.Schema<any>,
        protected valueSource: () => T | T,
    ) {
    }

    public changeSchema(schema: yup.Schema<any>) {
        this.clearAllErrors();
        this.schema = schema;
    }

    public async validate(): Promise<void> {
        this.clearAllErrors();
        try {
            await this.schema.validate(this.valueSource(), { abortEarly: false, recursive: true });
        } catch (e) {
            if (!e.inner) {
                throw e;
            }
            this.handleErrors(e.inner);
        }
        this.formState = this.formErrors.length === 0 ? 'VALID' : 'INVALID';
    }

    public async validateField(path: string | keyof T) {
        this.clearError(path);
        try {
            await this.schema.validateAt(path as string, this.valueSource(), { abortEarly: false, recursive: true });
        } catch (e) {
            if (!e.inner) {
                throw e;
            }
            this.handleErrors(e.inner, path);
        }
        this.formState = this.formErrors.length === 0 ? 'VALID' : 'INVALID';
    }

    protected handleErrors(errors: any[], path = null) {
        for (const error of errors) {
            if (error.path === path && error.message || path === null) {
                this.formErrors.push({
                    path: error.params.path === 'this' ? 'this' : error.path,
                    message: error.message,
                    validator: error.type,
                });
            }
        }
    }

    /**
     * Returns first error for field by path
     */
    public getError(path: string | keyof T): FormError {
        return this.formErrors.find(e => e.path === path);
    }

    /**
     * Returns first error's message for field by path
     */
    public getErrorText(path: string | keyof T): string {
        const error = this.getError(path);

        return error ? error.message : null;
    }

    /**
     * Clear all errors for field by path
     */
    public clearError(path: string | keyof T) {
        this.formErrors = this.formErrors.filter(error => error.path !== path);
    }

    /**
     * Clear all errors
     */
    public clearAllErrors() {
        this.formErrors = [];
    }

    public takeSnapshot() {
        this.valueSnapshot = _.cloneDeep(this.valueSource());
    }

    public isChanged(path: string | keyof T): boolean {
        if (this.valueSnapshot === null) {
            return null;
        }

        // TODO! Check more complicated situations
        return _.get(this.valueSnapshot, path) !== _.get(this.valueSource(), path);
    }

    public isTouched(path: string) {
        // TODO! Check more complicated situations
        return this.isChanged(path) || !this.isEmpty(_.get(this.valueSource(), path));
    }

    protected isEmpty(value) {
        return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    }
}
