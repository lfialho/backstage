/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  ChangeEvent,
  KeyboardEvent,
  useState,
  useEffect,
  useCallback,
  ComponentType,
  Dispatch,
  SetStateAction,
} from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  InputBase,
  InputBaseProps,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import ClearButton from '@material-ui/icons/Clear';

import {
  AnalyticsContext,
  configApiRef,
  useApi,
} from '@backstage/core-plugin-api';

import { SearchContextProvider, useSearch } from '../../context';
import { TrackSearch } from '../SearchTracker';
import { Autocomplete, AutocompleteProps } from '@material-ui/lab';

/**
 * Wraps a component in local search context when there is no parent search context defined.
 * @internal
 */
const withSearchContext = <T extends {}>(Component: ComponentType<T>) => {
  return (props: T) => (
    <SearchContextProvider useParentContext>
      <Component {...props} />
    </SearchContextProvider>
  );
};

/**
 * Props for {@link SearchBarBase}.
 *
 * @public
 */
export type SearchBarBaseProps = Omit<InputBaseProps, 'onChange'> & {
  debounceTime?: number;
  clearButton?: boolean;
  onClear?: () => void;
  onSubmit?: () => void;
  onChange: (value: string) => void;
};

/**
 * All search boxes exported by the search plugin are based on the <SearchBarBase />,
 * and this one is based on the <InputBase /> component from Material UI.
 * Recommended if you don't use Search Provider or Search Context.
 *
 * @public
 */
export const SearchBarBase = ({
  onChange,
  onKeyDown,
  onSubmit,
  debounceTime = 200,
  clearButton = true,
  fullWidth = true,
  value: defaultValue,
  inputProps: defaultInputProps = {},
  endAdornment: defaultEndAdornment,
  ...props
}: SearchBarBaseProps) => {
  const configApi = useApi(configApiRef);
  const [value, setValue] = useState<string>(defaultValue as string);

  useEffect(() => {
    setValue(prevValue =>
      prevValue !== defaultValue ? (defaultValue as string) : prevValue,
    );
  }, [defaultValue]);

  useDebounce(() => onChange(value), debounceTime, [value]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (onKeyDown) onKeyDown(e);
      if (onSubmit && e.key === 'Enter') {
        onSubmit();
      }
    },
    [onKeyDown, onSubmit],
  );

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const placeholder = `Search in ${
    configApi.getOptionalString('app.title') || 'Backstage'
  }`;

  const startAdornment = (
    <InputAdornment position="start">
      <IconButton aria-label="Query" disabled>
        <SearchIcon />
      </IconButton>
    </InputAdornment>
  );

  const endAdornment = (
    <InputAdornment position="end">
      <IconButton aria-label="Clear" onClick={handleClear}>
        <ClearButton />
      </IconButton>
    </InputAdornment>
  );

  return (
    <TrackSearch>
      <InputBase
        data-testid="search-bar-next"
        value={value}
        placeholder={placeholder}
        startAdornment={startAdornment}
        endAdornment={clearButton ? endAdornment : defaultEndAdornment}
        inputProps={{ 'aria-label': 'Search', ...defaultInputProps }}
        fullWidth={fullWidth}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </TrackSearch>
  );
};

const useSearchBarState = (
  defaultValue: unknown,
): [string, Dispatch<SetStateAction<string>>] => {
  const { term: value, setTerm: setValue } = useSearch();

  // Set term if a default value is provided
  useEffect(() => {
    if (defaultValue) {
      setValue(String(defaultValue));
    }
  }, [defaultValue, setValue]);

  return [value, setValue];
};

/**
 * Props for {@link SearchBarInput}.
 *
 * @public
 */
export type SearchBarInputProps = Partial<SearchBarBaseProps>;

/**
 * Recommended search bar input when you use the Search Provider or Search Context.
 *
 * @public
 */
export const SearchBarInput = withSearchContext(
  ({ value: defaultValue = '', onChange, ...rest }: SearchBarInputProps) => {
    const [value, setValue] = useSearchBarState(defaultValue);

    const handleChange = useCallback(
      (newValue: string) => {
        if (onChange) {
          onChange(newValue);
        } else {
          setValue(newValue);
        }
      },
      [onChange, setValue],
    );

    return (
      <AnalyticsContext
        attributes={{ pluginId: 'search', extension: 'SearchBar' }}
      >
        <SearchBarBase {...rest} value={value} onChange={handleChange} />
      </AnalyticsContext>
    );
  },
);

/**
 * Props for {@link SearchBar}.
 * @deprecated Use {@link SearchBarInputProps} instead.
 * @public
 */
export type SearchBarProps = SearchBarInputProps;

/**
 * Recommended search bar input when you use the Search Provider or Search Context.
 * @deprecated Use {@link SearchBarInput} instead.
 * @public
 */
export const SearchBar = SearchBarInput;

/**
 * Props for {@link SearchBarAutocomplete}.
 *
 * @public
 */
export type SearchBarAutocompleteProps<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined,
> = Omit<
  AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>,
  'renderInput' | 'inputValue' | 'onInputChange'
> & {
  inputProps?: SearchBarInputProps;
};

/**
 * Recommended search bar autocomplete when you use the Search Provider or Search Context.
 *
 * @public
 */
export const SearchBarAutocomplete = withSearchContext(
  function SearchBarAutocompleteComponent<
    T,
    Multiple extends boolean | undefined = undefined,
    DisableClearable extends boolean | undefined = undefined,
    FreeSolo extends boolean | undefined = undefined,
  >({
    loading,
    fullWidth,
    inputProps = {},
    ...rest
  }: SearchBarAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
    const {
      value: defaultInputValue,
      endAdornment: inputEndAdornment,
      onChange: onInputChange,
      ...restInput
    } = inputProps;

    const [inputValue, setInputValue] = useSearchBarState(defaultInputValue);

    const handleInputChange = useCallback(
      (newValue: string) => {
        if (onInputChange) {
          onInputChange(newValue);
        } else {
          setInputValue(newValue);
        }
      },
      [onInputChange, setInputValue],
    );

    return (
      <Autocomplete
        {...rest}
        data-testid="search-bar-autocomplete"
        fullWidth={fullWidth}
        renderInput={params => (
          <SearchBarInput
            {...params}
            {...restInput}
            value={inputValue}
            onChange={handleInputChange}
            endAdornment={
              loading ? (
                <CircularProgress
                  data-testid="search-bar-autocomplet-progress"
                  color="inherit"
                  size={20}
                />
              ) : (
                inputEndAdornment
              )
            }
          />
        )}
      />
    );
  },
);
