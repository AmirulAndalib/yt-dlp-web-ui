import {
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { debounceTime, distinctUntilChanged, map, of, takeWhile } from "rxjs";
import { CliArguments } from "./features/core/argsParser";
import I18nBuilder from "./features/core/intl";
import { RPCClient } from "./features/core/rpcClient";
import {
  LanguageUnion,
  setCliArgs,
  setEnableCustomArgs,
  setFileRenaming,
  setFormatSelection,
  setLanguage,
  setPathOverriding,
  setServerAddr,
  setServerPort,
  setTheme,
  ThemeUnion
} from "./features/settings/settingsSlice";
import { updated } from "./features/status/statusSlice";
import { RootState } from "./stores/store";
import { validateDomain, validateIP } from "./utils";

export default function Settings({ socket }: { socket: WebSocket }) {
  const settings = useSelector((state: RootState) => state.settings)
  const status = useSelector((state: RootState) => state.status)
  const dispatch = useDispatch()

  const [invalidIP, setInvalidIP] = useState(false);

  const i18n = useMemo(() => new I18nBuilder(settings.language), [settings.language])
  const client = useMemo(() => new RPCClient(socket), [settings.serverAddr, settings.serverPort])
  const cliArgs = useMemo(() => new CliArguments().fromString(settings.cliArgs), [settings.cliArgs])
  /**
   * Update the server ip address state and localstorage whenever the input value changes.  
   * Validate the ip-addr then set.s
   * @param event Input change event
   */
  const handleAddrChange = (event: any) => {
    const $serverAddr = of(event)
      .pipe(
        map(event => event.target.value),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(addr => {
        if (validateIP(addr)) {
          setInvalidIP(false)
          dispatch(setServerAddr(addr))
        } else if (validateDomain(addr)) {
          setInvalidIP(false)
          dispatch(setServerAddr(addr))
        } else {
          setInvalidIP(true)
        }
      })
    return $serverAddr.unsubscribe()
  }

  /**
   * Set server port
   */
  const handlePortChange = (event: any) => {
    const $port = of(event)
      .pipe(
        map(event => event.target.value),
        map(val => Number(val)),
        takeWhile(val => isFinite(val) && val <= 65535),
      )
      .subscribe(port => {
        dispatch(setServerPort(port.toString()))
      })
    return $port.unsubscribe()
  }

  /**
   * Language toggler handler 
   */
  const handleLanguageChange = (event: SelectChangeEvent<LanguageUnion>) => {
    dispatch(setLanguage(event.target.value as LanguageUnion));
  }

  /**
   * Theme toggler handler 
   */
  const handleThemeChange = (event: SelectChangeEvent<ThemeUnion>) => {
    dispatch(setTheme(event.target.value as ThemeUnion));
  }

  /**
   * Send via WebSocket a message in order to update the yt-dlp binary from server
   */
  const updateBinary = () => {
    client.updateExecutable().then(() => dispatch(updated()))
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={12} lg={12}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 240,
            }}
          >
            <Typography pb={2} variant="h6" color="primary">
              {i18n.t('settingsAnchor')}
            </Typography>
            <FormGroup>
              <Grid container spacing={2}>
                <Grid item xs={12} md={11}>
                  <TextField
                    fullWidth
                    label={i18n.t('serverAddressTitle')}
                    defaultValue={settings.serverAddr}
                    error={invalidIP}
                    onChange={handleAddrChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">ws://</InputAdornment>,
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <TextField
                    fullWidth
                    label={i18n.t('serverPortTitle')}
                    defaultValue={settings.serverPort}
                    onChange={handlePortChange}
                    error={isNaN(Number(settings.serverPort)) || Number(settings.serverPort) > 65535}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{i18n.t('languageSelect')}</InputLabel>
                    <Select
                      defaultValue={settings.language}
                      label={i18n.t('languageSelect')}
                      onChange={handleLanguageChange}
                    >
                      <MenuItem value="english">English</MenuItem>
                      <MenuItem value="spanish">Spanish</MenuItem>
                      <MenuItem value="italian">Italian</MenuItem>
                      <MenuItem value="chinese">Chinese</MenuItem>
                      <MenuItem value="russian">Russian</MenuItem>
                      <MenuItem value="korean">Korean</MenuItem>
                      <MenuItem value="japanese">Japanese</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{i18n.t('themeSelect')}</InputLabel>
                    <Select
                      defaultValue={settings.theme}
                      label={i18n.t('themeSelect')}
                      onChange={handleThemeChange}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={'Max download speed' || i18n.t('serverPortTitle')}
                    defaultValue={settings.serverPort}
                    onChange={handlePortChange}
                    error={isNaN(Number(settings.serverPort)) || Number(settings.serverPort) > 65535}
                    sx={{ mb: 2 }}
                  />
                </Grid> */}
              </Grid>
              <FormControlLabel
                control={
                  <Switch
                    defaultChecked={cliArgs.noMTime}
                    onChange={() => dispatch(setCliArgs(cliArgs.toggleNoMTime().toString()))}
                  />
                }
                label={i18n.t('noMTimeCheckbox')}
                sx={{ mt: 3 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    defaultChecked={cliArgs.extractAudio}
                    onChange={() => dispatch(setCliArgs(cliArgs.toggleExtractAudio().toString()))}
                    disabled={settings.formatSelection}
                  />
                }
                label={i18n.t('extractAudioCheckbox')}
              />
              <FormControlLabel
                control={
                  <Switch
                    defaultChecked={settings.formatSelection}
                    onChange={() => {
                      dispatch(setCliArgs(cliArgs.disableExtractAudio().toString()))
                      dispatch(setFormatSelection(!settings.formatSelection))
                    }}
                  />
                }
                label={i18n.t('formatSelectionEnabler')}
              />
              <Grid>
                <Typography variant="h6" color="primary" sx={{ mt: 2, mb: 0.5 }}>
                  {i18n.t('overridesAnchor')}
                </Typography>
                <Stack direction="column">
                  <FormControlLabel
                    control={
                      <Switch
                        defaultChecked={settings.pathOverriding}
                        onChange={() => {
                          dispatch(setPathOverriding(!settings.pathOverriding))
                        }}
                      />
                    }
                    label={i18n.t('pathOverrideOption')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        defaultChecked={settings.fileRenaming}
                        onChange={() => {
                          dispatch(setFileRenaming(!settings.fileRenaming))
                        }}
                      />
                    }
                    label={i18n.t('filenameOverrideOption')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        defaultChecked={settings.enableCustomArgs}
                        onChange={() => {
                          dispatch(setEnableCustomArgs(!settings.enableCustomArgs))
                        }}
                      />
                    }
                    label={i18n.t('customArgs')}
                  />
                </Stack>
              </Grid>
              <Grid>
                <Stack direction="row">
                  <Button
                    sx={{ mr: 1, mt: 3 }}
                    variant="contained"
                    onClick={() => dispatch(updated())}
                  >
                    {i18n.t('updateBinButton')}
                  </Button>
                </Stack>
              </Grid>
            </FormGroup>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={status.updated}
        autoHideDuration={1500}
        message={i18n.t('toastUpdated')}
        onClose={updateBinary}
      />
    </Container>
  );
}